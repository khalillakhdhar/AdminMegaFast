import { Component, OnInit, ViewChild, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ShipmentService } from 'src/app/core/services/shipment.service';
import { DriverService } from 'src/app/core/services/driver.service';
import { ShipmentPrintService } from 'src/app/core/services/shipment-print.service';
import { Shipment, ShipmentStatus, ShipmentHistoryEntry } from 'src/app/core/models/shipment.model';
import { PageTitleComponent } from 'src/app/shared/ui/pagetitle/pagetitle.component';

interface DriverOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-colis-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    PageTitleComponent,
    NgSelectModule
  ],
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColisDetailComponent implements OnInit, OnDestroy {
  @ViewChild('assignDriverModal') assignDriverModal!: ElementRef;

  private readonly destroy$ = new Subject<void>();
  private shipmentId!: string;

  // Breadcrumb items
  breadCrumbItems: Array<{ label: string; active?: boolean }> = [];

  // Data
  shipment$!: Observable<Shipment | undefined>;

  // Reference data
  drivers: DriverOption[] = [];
  private readonly driverMap = new Map<string, string>();

  // Forms
  assignDriverForm!: FormGroup;

  // Loading states
  isLoading = false;
  isProcessing = false;

  // Computed properties
  daysSinceCreation = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly shipmentService: ShipmentService,
    private readonly driverService: DriverService,
    private readonly printService: ShipmentPrintService,
    private readonly formBuilder: FormBuilder,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.shipmentId = this.route.snapshot.params['id'];

    this.breadCrumbItems = [
      { label: 'MegaFast' },
      { label: 'Colis', active: false },
      { label: 'Détail', active: true }
    ];

    this.initForms();
    this.loadReferenceData();
    this.loadShipment();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.assignDriverForm = this.formBuilder.group({
      driverId: [null]
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

  private loadShipment(): void {
    this.shipment$ = this.shipmentService.getById(this.shipmentId)
      .pipe(
        takeUntil(this.destroy$)
      );

    this.shipment$.subscribe(shipment => {
      if (shipment) {
        this.calculateDaysSinceCreation(shipment);
      }
    });
  }

  private calculateDaysSinceCreation(shipment: Shipment): void {
    if (shipment.createdAt) {
      const createdDate = shipment.createdAt.toDate();
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      this.daysSinceCreation = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // Template methods
  trackByHistoryEntry(index: number, entry: ShipmentHistoryEntry): string {
    return `${entry.at?.seconds || index}-${entry.status}`;
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

  getHistoryMarkerClass(status: ShipmentStatus): string {
    const classes: Record<ShipmentStatus, string> = {
      created: 'timeline-marker-secondary',
      assigned: 'timeline-marker-primary',
      in_transit: 'timeline-marker-info',
      delivered: 'timeline-marker-success',
      returned: 'timeline-marker-warning',
      canceled: 'timeline-marker-danger'
    };
    return classes[status];
  }

  getHistoryIcon(status: ShipmentStatus): string {
    const icons: Record<ShipmentStatus, string> = {
      created: 'bx bx-plus',
      assigned: 'bx bx-user',
      in_transit: 'bx bx-truck',
      delivered: 'bx bx-check',
      returned: 'bx bx-undo',
      canceled: 'bx bx-x'
    };
    return icons[status];
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

  // Actions
  editShipment(): void {
    // Since there's no separate edit route, we'll show a toast for now
    // In a real app, this could toggle an edit mode within this component
    this.toastr.info('Fonctionnalité d\'édition en cours de développement');
  }

  openAssignDriverModal(): void {
    this.assignDriverForm.reset();
    const modal = new (window as any).bootstrap.Modal(this.assignDriverModal.nativeElement);
    modal.show();
  }

  async assignDriver(): Promise<void> {
    const driverId = this.assignDriverForm.get('driverId')?.value;
    if (!driverId) return;

    this.isProcessing = true;

    try {
      await this.shipmentService.assignToDriver(this.shipmentId, driverId);
      this.toastr.success('Livreur assigné avec succès');
      const modal = (window as any).bootstrap.Modal.getInstance(this.assignDriverModal.nativeElement);
      modal?.hide();
      this.loadShipment();
    } catch (error) {
      console.error('Error assigning driver:', error);
      this.toastr.error('Erreur lors de l\'assignation du livreur');
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  async markAsDelivered(): Promise<void> {
    try {
      await this.shipmentService.setStatus(this.shipmentId, 'delivered', {
        note: 'Marqué comme livré depuis l\'interface admin'
      });

      this.toastr.success('Colis marqué comme livré');
      this.loadShipment();
    } catch (error) {
      console.error('Error marking as delivered:', error);
      this.toastr.error('Erreur lors de la mise à jour du statut');
    }
  }

  async cancelShipment(): Promise<void> {
    try {
      await this.shipmentService.setStatus(this.shipmentId, 'canceled', {
        note: 'Annulé depuis l\'interface admin'
      });

      this.toastr.success('Colis annulé avec succès');
      this.loadShipment();
    } catch (error) {
      console.error('Error canceling shipment:', error);
      this.toastr.error('Erreur lors de l\'annulation');
    }
  }

  printShipment(): void {
    this.shipment$.pipe(takeUntil(this.destroy$)).subscribe(shipment => {
      if (shipment) {
        this.printService.generateShipmentPdf(shipment).catch(err => {
          this.toastr.error('Erreur lors de l\'impression');
          console.error('Print error:', err);
        });
      }
    });
  }

  showOnMap(): void {
    // Implement map functionality
    this.toastr.info('Fonctionnalité de carte en cours de développement');
  }
}
