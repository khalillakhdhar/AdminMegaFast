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

import { PageTitleComponent } from 'src/app/shared/ui/pagetitle/pagetitle.component';
import { BatchService } from 'src/app/core/services/batch.service';
import { DriverService } from 'src/app/core/services/driver.service';
import { Batch, BatchStatus } from 'src/app/core/models/batch.model';

interface StatusOption {
  value: BatchStatus;
  label: string;
}

interface DriverOption {
  value: string;
  label: string;
}

interface BatchStats {
  totalBatches: number;
  inProgressBatches: number;
  completedBatches: number;
  totalAmount: number;
}

@Component({
  selector: 'app-batches-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    PageTitleComponent,
    PaginationModule,
    BsDatepickerModule,
    FormsModule,
    NgSelectModule
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchesListComponent implements OnInit, OnDestroy {
  @ViewChild('removeModal') removeModal!: ModalDirective;

  public readonly destroy$ = new Subject<void>();

  // Breadcrumb items
  breadCrumbItems: Array<{ label: string; active?: boolean }> = [];

  // Data
  batches: Batch[] = [];
  selectedBatchId: string | null = null;
  stats: BatchStats = {
    totalBatches: 0,
    inProgressBatches: 0,
    completedBatches: 0,
    totalAmount: 0
  };

  // Filters
  filterForm!: FormGroup;
  statusOptions: StatusOption[] = [
    { value: 'planned', label: 'Planifié' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'canceled', label: 'Annulé' }
  ];

  // Reference data
  drivers: DriverOption[] = [];
  driverMap = new Map<string, string>();

  // Pagination
  totalItems = 0;
  currentPage = 1;
  pageSize = 12;

  // Loading states
  isLoading = false;
  isProcessing = false;

  constructor(
    public batchService: BatchService,
    public driverService: DriverService,
    public formBuilder: FormBuilder,
    public modalService: BsModalService,
    public toastr: ToastrService,
    public router: Router,
    public cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'MegaFast' },
      { label: 'Lots', active: true }
    ];

    this.initForms();
    this.loadReferenceData();
    this.setupFilterSubscription();
    this.loadBatches();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public initForms(): void {
    this.filterForm = this.formBuilder.group({
      code: [''],
      status: [null],
      assignedTo: [null],
      dateRange: [null]
    });
  }

  public setupFilterSubscription(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadBatches();
      });
  }

  public loadReferenceData(): void {
    // Load drivers
    this.driverService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe(drivers => {
        this.drivers = drivers.map(driver => ({
          value: driver.id || '',
          label: driver.displayName || driver.name
        }));
        this.driverMap.clear();
        drivers.forEach(driver => {
          if (driver.id) {
            this.driverMap.set(driver.id, driver.name || driver.displayName);
          }
        });
        this.cdr.markForCheck();
      });
  }

  public loadBatches(): void {
    this.isLoading = true;

    this.batchService.getAll()
      .pipe(
        tap(() => {
          if (this.isLoading) {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (batches) => {
          this.batches = this.applyFilters(batches);
          this.totalItems = this.batches.length;
          this.calculateStats();
          if (this.isLoading) {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading batches:', error);
          this.toastr.error('Erreur lors du chargement des lots');
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  public applyFilters(batches: Batch[]): Batch[] {
    const formValue = this.filterForm.value;
    let filtered = [...batches];

    if (formValue.code?.trim()) {
      const searchTerm = formValue.code.trim().toLowerCase();
      filtered = filtered.filter(batch =>
        (batch.code || '').toLowerCase().includes(searchTerm) ||
        (batch.id || '').toLowerCase().includes(searchTerm)
      );
    }

    if (formValue.status) {
      filtered = filtered.filter(batch => batch.status === formValue.status);
    }

    if (formValue.assignedTo) {
      filtered = filtered.filter(batch => batch.assignedTo === formValue.assignedTo);
    }

    if (formValue.dateRange && formValue.dateRange.length === 2) {
      const [startDate, endDate] = formValue.dateRange;
      filtered = filtered.filter(batch => {
        if (!batch.createdAt) return false;
        const batchDate = batch.createdAt.toDate();
        return batchDate >= startDate && batchDate <= endDate;
      });
    }

    return filtered;
  }

  public calculateStats(): void {
    this.stats = {
      totalBatches: this.batches.length,
      inProgressBatches: this.batches.filter(b => b.status === 'in_progress').length,
      completedBatches: this.batches.filter(b => b.status === 'completed').length,
      totalAmount: this.batches.reduce((sum, b) => sum + (b.totalAmount || 0), 0)
    };
  }

  // Template methods
  trackByBatchId(index: number, batch: Batch): string {
    return batch.id;
  }

  getStatusBadgeClass(status: BatchStatus): string {
    const classes: Record<BatchStatus, string> = {
      planned: 'bg-secondary',
      in_progress: 'bg-primary',
      completed: 'bg-success',
      canceled: 'bg-danger'
    };
    return `badge ${classes[status]}`;
  }

  getStatusLabel(status: BatchStatus): string {
    const labels: Record<BatchStatus, string> = {
      planned: 'Planifié',
      in_progress: 'En cours',
      completed: 'Terminé',
      canceled: 'Annulé'
    };
    return labels[status];
  }

  getProgressBarClass(status: BatchStatus): string {
    const classes: Record<BatchStatus, string> = {
      planned: 'bg-secondary',
      in_progress: 'bg-primary',
      completed: 'bg-success',
      canceled: 'bg-danger'
    };
    return classes[status];
  }

  getProgressPercentage(batch: Batch): number {
    if (!batch.totalShipments || batch.totalShipments === 0) return 0;
    return Math.round(((batch.deliveredShipments || 0) / batch.totalShipments) * 100);
  }

  getDriverName(driverId: string): string {
    return this.driverMap.get(driverId) || 'Livreur inconnu';
  }

  // Pagination
  onPageChanged(event: PageChangedEvent): void {
    this.currentPage = event.page;
    // In a real implementation, you would reload data with pagination
  }

  // Actions
  viewDetails(batch: Batch): void {
    this.router.navigate(['/megafast/batches', batch.id]);
  }

  async startBatch(batchId: string): Promise<void> {
    try {
      await this.batchService.update(batchId, { status: 'in_progress' });
      this.toastr.success('Lot démarré avec succès');
      this.loadBatches();
    } catch (error) {
      console.error('Error starting batch:', error);
      this.toastr.error('Erreur lors du démarrage du lot');
    }
  }

  async completeBatch(batchId: string): Promise<void> {
    try {
      await this.batchService.update(batchId, { status: 'completed' });
      this.toastr.success('Lot terminé avec succès');
      this.loadBatches();
    } catch (error) {
      console.error('Error completing batch:', error);
      this.toastr.error('Erreur lors de la finalisation du lot');
    }
  }

  async recomputeStats(batchId: string): Promise<void> {
    try {
      await this.batchService.recomputeStats(batchId);
      this.toastr.success('Statistiques recalculées');
      this.loadBatches();
    } catch (error) {
      console.error('Error recomputing stats:', error);
      this.toastr.error('Erreur lors du recalcul des statistiques');
    }
  }

  async bulkRecomputeStats(): Promise<void> {
    this.isProcessing = true;
    let completed = 0;
    const total = this.batches.length;

    try {
      for (const batch of this.batches) {
        if (batch.id) {
          await this.batchService.recomputeStats(batch.id);
          completed++;
        }
      }

      this.toastr.success(`Statistiques recalculées pour ${completed}/${total} lots`);
      this.loadBatches();
    } catch (error) {
      console.error('Error bulk recomputing stats:', error);
      this.toastr.error('Erreur lors du recalcul en masse');
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  optimizeRoutes(): void {
    this.toastr.info('Optimisation des routes en cours de développement');
  }

  confirmDelete(batchId: string): void {
    this.selectedBatchId = batchId;
    this.removeModal.show();
  }

  async deleteBatch(): Promise<void> {
    if (!this.selectedBatchId) return;

    this.isProcessing = true;

    try {
      await this.batchService.delete(this.selectedBatchId);
      this.toastr.success('Lot supprimé avec succès');
      this.removeModal.hide();
      this.loadBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      this.toastr.error('Erreur lors de la suppression');
    } finally {
      this.isProcessing = false;
      this.selectedBatchId = null;
      this.cdr.markForCheck();
    }
  }

  exportData(format: 'excel' | 'pdf'): void {
    this.toastr.info(`Export ${format.toUpperCase()} en cours de développement`);
  }
}
