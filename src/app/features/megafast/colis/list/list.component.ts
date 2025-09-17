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
  driverMap = new Map<string, string>();

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
      dateRange: [null]
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

  async markAsDelivered(shipmentId: string): Promise<void> {
    try {
      await this.shipmentService.setStatus(shipmentId, 'delivered', {
        note: 'Marqué comme livré depuis l\'interface admin'
      });

      this.toastr.success('Colis marqué comme livré');
      this.loadShipments();
    } catch (error) {
      console.error('Error marking as delivered:', error);
      this.toastr.error('Erreur lors de la mise à jour du statut');
    }
  }

  // Delete shipment permanently
  async deleteShipment(shipmentId: string): Promise<void> {
    try {
      if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce colis ? Cette action est irréversible.')) {
        await this.shipmentService.delete(shipmentId);
        this.toastr.success('Colis supprimé avec succès');
        this.loadShipments();
      }
    } catch (error) {
      console.error('Error deleting shipment:', error);
      this.toastr.error('Erreur lors de la suppression du colis');
    }
  }

  // Check if shipment can be deleted (only if not delivered)
  canDelete(status: string): boolean {
    return status !== 'delivered';
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
