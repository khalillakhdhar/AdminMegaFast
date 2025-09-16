import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { BsModalService, ModalDirective } from 'ngx-bootstrap/modal';
import { PaginationModule, PageChangedEvent } from 'ngx-bootstrap/pagination';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';

import { ShipmentService, ShipmentListFilters } from '../../../../core/services/shipment.service';
import { ShipmentPrintService } from '../../../../core/services/shipment-print.service';
import { ClientService } from '../../../../core/services/client.service';
import { BatchService } from '../../../../core/services/batch.service';
import { DriverService } from '../../../../core/services/driver.service';
import { Shipment, ShipmentStatus } from '../../../../core/models/shipment.model';
import { PageTitleComponent } from '../../../../shared/ui/pagetitle/pagetitle.component';

interface StatusOption {
  value: ShipmentStatus;
  label: string;
}

interface DriverOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-colis-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    PageTitleComponent,
    PaginationModule,
    BsDatepickerModule,
    NgSelectModule
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColisListComponent implements OnInit, OnDestroy {
  @ViewChild('removeModal') removeModal!: ModalDirective;
  @ViewChild('assignBatchModal') assignBatchModal!: ModalDirective;

  private readonly destroy$ = new Subject<void>();

  // Breadcrumb items
  breadCrumbItems: Array<{ label: string; active?: boolean }> = [];

  // Data
  shipments: Shipment[] = [];
  selectedShipment: Shipment | null = null;
  selectedShipmentId: string | null = null;
  selectedShipments = new Set<string>();
  allSelected = false;

  // Filters
  filterForm!: FormGroup;
  statusOptions: StatusOption[] = [
    { value: 'created', label: 'Créé' },
    { value: 'assigned', label: 'Assigné' },
    { value: 'in_transit', label: 'En transit' },
    { value: 'delivered', label: 'Livré' },
    { value: 'returned', label: 'Retourné' },
    { value: 'canceled', label: 'Annulé' }
  ];

  // Reference data
  drivers: DriverOption[] = [];
  batches: any[] = [];
  driverMap = new Map<string, string>();
  batchMap = new Map<string, string>();

  // Assign batch form
  assignBatchForm!: FormGroup;

  // Pagination
  totalItems = 0;
  currentPage = 1;
  pageSize = 10;

  // Loading states
  isLoading = false;
  isProcessing = false;

  // Sort
  sortColumn: string = 'createdAt';
  sortDirection: string = 'desc';

  // Math reference for template
  Math = Math;

  constructor(
    public shipmentService: ShipmentService,
    public clientService: ClientService,
    public batchService: BatchService,
    public driverService: DriverService,
    public formBuilder: FormBuilder,
    public modalService: BsModalService,
    public toastr: ToastrService,
    public router: Router,
  public cdr: ChangeDetectorRef,
  private readonly printService: ShipmentPrintService
  ) {}

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'MegaFast' },
      { label: 'Colis', active: true }
    ];

    this.initForms();
    this.loadReferenceData();
    this.setupFilterSubscription();
    this.loadShipments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.filterForm = this.formBuilder.group({
      barcode: [''],
      clientPhone: [''],
      status: [null],
      assignedTo: [null],
      batchId: [null],
      dateRange: [null]
    });

    this.assignBatchForm = this.formBuilder.group({
      batchId: [null]
    });
  }

  private setupFilterSubscription(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadShipments();
      });
  }

  private loadReferenceData(): void {
    // Load drivers
    this.driverService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe(drivers => {
        this.drivers = drivers.map(driver => ({
          value: driver.id || '',
          label: driver.name
        }));
        this.driverMap.clear();
        drivers.forEach(driver => {
          if (driver.id) {
            this.driverMap.set(driver.id, driver.name);
          }
        });
        this.cdr.markForCheck();
      });

    // Load batches
    this.batchService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe(batches => {
        this.batches = batches;
        this.batchMap.clear();
        batches.forEach(batch => {
          if (batch.id) {
            this.batchMap.set(batch.id, batch.code || batch.id);
          }
        });
        this.cdr.markForCheck();
      });
  }

  private loadShipments(): void {
    this.isLoading = true;

    const filters: ShipmentListFilters = this.buildFilters();

    this.shipmentService.list(filters)
      .pipe(
        tap(() => {
          // The stream is live (Firestore); clear the loading flag on first emission
          if (this.isLoading) {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (shipments) => {
          this.shipments = shipments;
          this.totalItems = shipments.length; // For demo, in real app would come from service
          this.updateSelectionState();
          // Safety: ensure loading is false if emission arrives before tap (unlikely)
          if (this.isLoading) {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading shipments:', error);
          this.toastr.error('Erreur lors du chargement des colis');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private buildFilters(): ShipmentListFilters {
    const formValue = this.filterForm.value;
    const filters: ShipmentListFilters = {
      orderBy: this.sortColumn as any,
      orderDir: this.sortDirection as any,
      limit: this.pageSize
    };

    if (formValue.barcode?.trim()) {
      filters.barcode = formValue.barcode.trim();
    }
    if (formValue.clientPhone?.trim()) {
      filters.clientPhone = formValue.clientPhone.trim();
    }
    if (formValue.status) {
      filters.status = formValue.status;
    }
    if (formValue.assignedTo) {
      filters.assignedTo = formValue.assignedTo;
    }
    if (formValue.batchId) {
      filters.batchId = formValue.batchId;
    }
    if (formValue.dateRange && formValue.dateRange.length === 2) {
      filters.dateFrom = formValue.dateRange[0];
      filters.dateTo = formValue.dateRange[1];
    }

    return filters;
  }

  // Template methods
  trackByShipmentId(index: number, shipment: Shipment): string {
    return shipment.id;
  }

  getStatusBadgeClass(status: ShipmentStatus): string {
    const classes: Record<ShipmentStatus, string> = {
      created: 'bg-secondary',
      assigned: 'bg-primary',
      in_transit: 'bg-info',
      delivered: 'bg-success',
      returned: 'bg-warning',
      canceled: 'bg-danger'
    };
    return `badge ${classes[status]}`;
  }

  getStatusLabel(status: ShipmentStatus): string {
    const labels: Record<ShipmentStatus, string> = {
      created: 'Créé',
      assigned: 'Assigné',
      in_transit: 'En transit',
      delivered: 'Livré',
      returned: 'Retourné',
      canceled: 'Annulé'
    };
    return labels[status];
  }

  getDriverName(driverId: string): string {
    return this.driverMap.get(driverId) || 'Inconnu';
  }

  getBatchCode(batchId: string): string {
    return this.batchMap.get(batchId) || 'Inconnu';
  }

  canMarkAsDelivered(status: ShipmentStatus): boolean {
    return ['assigned', 'in_transit'].includes(status);
  }

  canCancel(status: ShipmentStatus): boolean {
    return ['created', 'assigned', 'in_transit'].includes(status);
  }

  // Selection methods
  toggleSelectAll(event: any): void {
    const checked = event.target.checked;
    this.allSelected = checked;

    if (checked) {
      this.shipments.forEach(shipment => {
        this.selectedShipments.add(shipment.id);
      });
    } else {
      this.selectedShipments.clear();
    }
  }

  toggleShipmentSelection(shipmentId: string, event: any): void {
    const checked = event.target.checked;

    if (checked) {
      this.selectedShipments.add(shipmentId);
    } else {
      this.selectedShipments.delete(shipmentId);
    }

    this.updateSelectionState();
  }

  private updateSelectionState(): void {
    this.allSelected = this.shipments.length > 0 &&
      this.shipments.every(shipment => this.selectedShipments.has(shipment.id));
  }

  // Sorting
  onSort(event: { column: string; direction: string }): void {
    this.sortColumn = event.column;
    this.sortDirection = event.direction;
    this.loadShipments();
  }

  // Pagination
  onPageChanged(event: PageChangedEvent): void {
    this.currentPage = event.page;
    this.loadShipments();
  }

  // Actions
  viewDetails(shipment: Shipment): void {
    this.router.navigate(['/megafast/colis', shipment.id]);
  }

  openAssignBatchModal(shipment: Shipment): void {
    this.selectedShipment = shipment;
    this.assignBatchForm.reset();
    this.assignBatchModal.show();
  }

  async assignToBatch(): Promise<void> {
    const batchId = this.assignBatchForm.get('batchId')?.value;
    if (!batchId || !this.selectedShipment?.id) return;

    this.isProcessing = true;

    try {
      await this.shipmentService.assignToBatch(this.selectedShipment.id, batchId);
      await this.batchService.recomputeStats(batchId);

      this.toastr.success('Colis assigné au lot avec succès');
      this.assignBatchModal.hide();
      this.loadShipments();
    } catch (error) {
      console.error('Error assigning to batch:', error);
      this.toastr.error('Erreur lors de l\'assignation au lot');
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  async markAsDelivered(shipmentId: string): Promise<void> {
    try {
      await this.shipmentService.setStatus(shipmentId, 'delivered', {
        note: 'Marqué comme livré depuis l\'interface admin'
      });

      this.toastr.success('Colis marqué comme livré');
      this.loadShipments();

      // Update batch stats if shipment is in a batch
      const shipment = this.shipments.find(s => s.id === shipmentId);
      if (shipment?.batchId) {
        await this.batchService.recomputeStats(shipment.batchId);
      }
    } catch (error) {
      console.error('Error marking as delivered:', error);
      this.toastr.error('Erreur lors de la mise à jour du statut');
    }
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    try {
      await this.shipmentService.setStatus(shipmentId, 'canceled', {
        note: 'Annulé depuis l\'interface admin'
      });

      this.toastr.success('Colis annulé avec succès');
      this.loadShipments();
    } catch (error) {
      console.error('Error canceling shipment:', error);
      this.toastr.error('Erreur lors de l\'annulation');
    }
  }

  async markInTransit(shipmentId: string): Promise<void> {
    try {
      await this.shipmentService.setStatus(shipmentId, 'in_transit', {
        note: 'Marqué en transit depuis la liste'
      });
      this.toastr.success('Colis marqué en transit');
      this.loadShipments();
    } catch (error) {
      console.error('Error marking in transit:', error);
      this.toastr.error('Erreur lors de la mise à jour du statut');
    }
  }

  confirmDelete(shipmentId: string): void {
    this.selectedShipmentId = shipmentId;
    this.removeModal.show();
  }

  async deleteShipment(): Promise<void> {
    if (!this.selectedShipmentId) return;

    this.isProcessing = true;

    try {
      await this.shipmentService.delete(this.selectedShipmentId);
      this.toastr.success('Colis supprimé avec succès');
      this.removeModal.hide();
      this.loadShipments();
    } catch (error) {
      console.error('Error deleting shipment:', error);
      this.toastr.error('Erreur lors de la suppression');
    } finally {
      this.isProcessing = false;
      this.selectedShipmentId = null;
      this.cdr.markForCheck();
    }
  }

  printShipment(shipmentId: string): void {
    const sh = this.shipments.find(s => s.id === shipmentId);
    if (!sh) { this.toastr.error('Colis introuvable'); return; }
    this.printService.generateShipmentPdf(sh).catch(err => {
      console.error('Erreur impression colis:', err);
      this.toastr.error('Échec de l\'impression');
    });
  }

  exportData(format: 'excel' | 'pdf'): void {
    // Implement export functionality
    this.toastr.info(`Export ${format.toUpperCase()} en cours de développement`);
  }
}
