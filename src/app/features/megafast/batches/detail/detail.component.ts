import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { takeUntil, map, switchMap } from 'rxjs/operators';

import { PageTitleComponent } from '../../../../shared/ui/pagetitle/pagetitle.component';
import { BatchService } from '../../../../core/services/batch.service';
import { ShipmentService } from '../../../../core/services/shipment.service';
import { ToastrService } from 'ngx-toastr';
import { Batch, BatchStatus } from '../../../../core/models/batch.model';
import { Shipment, ShipmentStatus } from '../../../../core/models/shipment.model';
import { ShipmentPrintService } from '../../../../core/services/shipment-print.service';
import { DriverService } from '../../../../core/services/driver.service';
import { Driver } from '../../../../core/models/driver.model';

interface BatchStats {
  totalShipments: number;
  completedShipments: number;
  pendingShipments: number;
  completionPercentage: number;
  estimatedDeliveryTime: string;
  totalCOD: number;
  collectedCOD: number;
}

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule,
    PageTitleComponent,
    FormsModule,

  ],
  templateUrl: './detail.component.html',
  styleUrl: './detail.component.scss'
})
export class DetailComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly batchId$ = new BehaviorSubject<string | null>(null);

  breadCrumbItems = [
    { label: 'MegaFast', active: false },
    { label: 'Lots', active: false, link: '/megafast/batches' },
    { label: 'Détails', active: true }
  ];

  batch$: Observable<Batch | null>;
  batchShipments$: Observable<Shipment[]>;
  availableShipments$: Observable<Shipment[]>;
  drivers$: Observable<Driver[]> = of([]);
  private readonly driverMap = new Map<string, string>();

  // Keep latest values for actions like export
  currentBatch: Batch | null = null;
  shipments: Shipment[] = [];

  batchStats: BatchStats = {
    totalShipments: 0,
    completedShipments: 0,
    pendingShipments: 0,
    completionPercentage: 0,
    estimatedDeliveryTime: '',
    totalCOD: 0,
    collectedCOD: 0
  };

  // Forms
  addShipmentsForm: FormGroup;
  optimizeRouteForm: FormGroup;

  // UI State
  isLoadingShipments = false;
  isOptimizing = false;
  selectedShipments: string[] = [];
  showAddShipmentsModal = false;
  showOptimizeModal = false;
  showRemoveModal = false;
  shipmentToRemove: string | null = null;

  // Filters
  shipmentStatusFilter = '';
  searchTerm = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly batchService: BatchService,
    private readonly shipmentService: ShipmentService,
  private readonly toastrService: ToastrService,
  private readonly shipmentPrintService: ShipmentPrintService,
  private readonly driverService: DriverService
  ) {
    this.initializeForms();
    this.initializeObservables();
  }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const batchId = params['id'];
      if (batchId) {
        this.batchId$.next(batchId);
        this.loadBatchData(batchId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.addShipmentsForm = this.fb.group({
      shipmentIds: [[], Validators.required],
      assignDriver: [false],
      driverId: [''],
      priority: ['normal']
    });

    this.optimizeRouteForm = this.fb.group({
      optimizationType: ['distance', Validators.required],
      considerTraffic: [true],
      maxDeliveryTime: ['8'],
      startLocation: ['', Validators.required]
    });
  }

  private initializeObservables(): void {
    this.batch$ = this.batchId$.pipe(
      switchMap(id => id ? this.batchService.getById(id) : of(null))
    );

    this.batchShipments$ = this.batchId$.pipe(
      switchMap(id => id ? this.shipmentService.list({ batchId: id }) : of([]))
    );

  this.availableShipments$ = this.shipmentService.list().pipe(
      map(shipments => shipments.filter(s =>
        (s.status === 'created' || s.status === 'assigned') && !s.batchId
      ))

    );

  // Drivers list for assignment UI
  this.drivers$ = this.driverService.getAll();
    // Keep a local map for quick name resolution
    this.drivers$.pipe(takeUntil(this.destroy$)).subscribe(list => {
      this.driverMap.clear();
      list?.forEach(d => {
        if (d?.id) this.driverMap.set(d.id, d.name || (d as any).displayName || '-');
      });
    });

    // Calculate stats when batch or shipments change
    combineLatest([this.batch$, this.batchShipments$]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([batch, shipments]) => {
      console.log('combineLatest received:', { batch, shipments });
      if (batch && shipments) {
        this.currentBatch = batch;
        this.shipments = shipments;
        console.log('Updated shipments:', shipments.length);
        this.calculateBatchStats(batch, shipments);
      }
    });

    // Debug: Log batchShipments$ separately
    this.batchShipments$.pipe(takeUntil(this.destroy$)).subscribe(shipments => {
      console.log('batchShipments$ emitted:', shipments);
    });
  }

  // detail.component.ts
private loadBatchData(batchId: string): void {
  this.isLoadingShipments = true;

  this.batchService.getById(batchId).pipe(
    takeUntil(this.destroy$)
  ).subscribe({
    next: (batch) => {
      if (batch) {
        this.breadCrumbItems[2].label = `Lot ${batch.code || batchId}`; // batch.id peut être absent si pas de idField
        this.currentBatch = batch as any;
        console.log('Lot chargé:', batch);
        // Shipments are loaded automatically via batchShipments$ observable
      }
      this.isLoadingShipments = false;
    },
    error: (error) => {
      console.error('Erreur lors du chargement du lot:', error);
      this.toastrService.error('Erreur lors du chargement du lot');
      this.isLoadingShipments = false;
    }
  });
}

// load shipment for batch
private loadShipmentsForBatch(batchId: string): void {
  this.isLoadingShipments = true;

  this.shipmentService.list({ batchId }).pipe(
    takeUntil(this.destroy$)
  ).subscribe({
    next: (shipments) => {
      this.shipments = shipments || [];
      console.log(`Colis chargés pour le lot ${batchId}:`, this.shipments);
      // Recalculate stats using the currently loaded batch if available
      if (this.currentBatch) {
        this.calculateBatchStats(this.currentBatch, this.shipments);
      }

      this.isLoadingShipments = false;
    },
    error: (error) => {
      console.error('Erreur lors du chargement des colis du lot:', error);
      this.toastrService.error('Erreur lors du chargement des colis du lot');
      this.isLoadingShipments = false;
    }
  });
}


  private calculateBatchStats(batch: Batch, shipments: Shipment[]): void {
    const totalShipments = shipments.length;
    const completedShipments = shipments.filter(s => s.status === 'delivered').length;
    const pendingShipments = totalShipments - completedShipments;

    this.batchStats = {
      totalShipments,
      completedShipments,
      pendingShipments,
      completionPercentage: totalShipments > 0 ? Math.round((completedShipments / totalShipments) * 100) : 0,
      estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(shipments),
      totalCOD: shipments.reduce((sum, s) => sum + (s.amount || 0), 0),
      collectedCOD: shipments
        .filter(s => s.status === 'delivered')
        .reduce((sum, s) => sum + (s.amount || 0), 0)
    };
  }

  private calculateEstimatedDeliveryTime(shipments: Shipment[]): string {
    const pendingShipments = shipments.filter(s =>
      !['delivered', 'cancelled', 'returned'].includes(s.status)
    );

    if (pendingShipments.length === 0) return 'Terminé';

    // Simple estimation: 30 minutes per shipment
    const estimatedMinutes = pendingShipments.length * 30;
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  // Modal Actions
  openAddShipmentsModal(): void {
    this.showAddShipmentsModal = true;
    this.addShipmentsForm.reset();
  }

  closeAddShipmentsModal(): void {
    this.showAddShipmentsModal = false;
  }

  openOptimizeModal(): void {
    this.showOptimizeModal = true;
    this.optimizeRouteForm.reset({
      optimizationType: 'distance',
      considerTraffic: true,
      maxDeliveryTime: '8'
    });
  }

  closeOptimizeModal(): void {
    this.showOptimizeModal = false;
  }

  openRemoveModal(shipmentId: string): void {
    this.shipmentToRemove = shipmentId;
    this.showRemoveModal = true;
  }

  closeRemoveModal(): void {
    this.showRemoveModal = false;
    this.shipmentToRemove = null;
  }

  // Batch Actions
  addShipmentsToBatch(): void {
    if (this.addShipmentsForm.valid && this.batchId$.value) {
      const formData = this.addShipmentsForm.value;

      // Utiliser la méthode bulkAssignToBatch du ShipmentService
      this.shipmentService.bulkAssignToBatch(
        formData.shipmentIds,
        this.batchId$.value
      ).then(() => {
        this.toastrService.success('Colis ajoutés au lot avec succès');
        this.closeAddShipmentsModal();
        this.loadBatchData(this.batchId$.value);
      }).catch((error) => {
        console.error('Erreur lors de l\'ajout des colis:', error);
        this.toastrService.error('Erreur lors de l\'ajout des colis');
      });
    }
  }

  // Obsolète; remplacé par removeShipmentFromBatch(id?: string) plus bas

  optimizeRoute(): void {
    if (this.optimizeRouteForm.valid && this.batchId$.value) {
      this.isOptimizing = true;
      // Simulation d'optimisation
      setTimeout(() => {
        this.toastrService.success('Itinéraire optimisé avec succès');
        this.isOptimizing = false;
        this.closeOptimizeModal();
        this.loadBatchData(this.batchId$.value);
      }, 2000);
    }
  }

  startBatch(): void {
    if (this.batchId$.value) {
      this.batchService.update(this.batchId$.value, { status: 'in_progress' as BatchStatus }).then(() => {
        this.toastrService.success('Lot démarré avec succès');
        this.loadBatchData(this.batchId$.value);
      }).catch((error) => {
        console.error('Erreur lors du démarrage du lot:', error);
        this.toastrService.error('Erreur lors du démarrage du lot');
      });
    }
  }

  assignDriverToBatch(driverId: string): void {
    if (!this.batchId$.value) return;
    this.batchService.update(this.batchId$.value, { assignedTo: driverId as any }).then(() => {
      this.toastrService.success('Livreur assigné au lot');
      this.refreshShipments();
    }).catch(err => {
      console.error('Erreur assignation livreur:', err);
      this.toastrService.error("Échec de l'assignation du livreur");
    });
  }

  completeBatch(): void {
    if (this.batchId$.value) {
      this.batchService.update(this.batchId$.value, { status: 'completed' as BatchStatus }).then(() => {
        this.toastrService.success('Lot terminé avec succès');
        this.loadBatchData(this.batchId$.value);
      }).catch((error) => {
        console.error('Erreur lors de la finalisation du lot:', error);
        this.toastrService.error('Erreur lors de la finalisation du lot');
      });
    }
  }

  duplicateBatch(): void {
    if (this.batchId$.value) {
      // Simulation de duplication
      this.toastrService.info('Fonctionnalité de duplication en développement');
    }
  }

  // Export PDF du manifeste du lot
  exportBatchReport(): void {
    try {
      if (!this.currentBatch) {
        this.toastrService.error('Lot introuvable');
        return;
      }
      // Appel au service d'impression (le chargement PDF est lazy via pdfmake)
      this.shipmentPrintService.generateBatchManifestPdf(this.currentBatch, this.shipments)
        .then(() => this.toastrService.success('Rapport exporté'))
        .catch(err => {
          console.error('Erreur export PDF lot:', err);
          this.toastrService.error('Échec de l\'export PDF');
        });
    } catch (err) {
      console.error('Erreur export PDF lot:', err);
      this.toastrService.error('Échec de l\'export PDF');
    }
  }

  // Utility Methods
  getStatusBadgeClass(status: ShipmentStatus): string {
    const classes: Record<string, string> = {
      // Shipments
      created: 'badge-soft-warning',
      assigned: 'badge-soft-info',
      in_transit: 'badge-soft-primary',
      delivered: 'badge-soft-success',
      returned: 'badge-soft-danger',
      canceled: 'badge-soft-secondary',
      // Batches
      planned: 'badge-soft-warning',
      in_progress: 'badge-soft-primary',
      completed: 'badge-soft-success'
    };
    return classes[status] || 'badge-soft-secondary';
  }

  // Helpers attendus par le template
  getShipmentStatusBadgeClass(status: ShipmentStatus): string {
    return this.getStatusBadgeClass(status);
  }
  getShipmentStatusLabel(status: ShipmentStatus): string {
    return this.getStatusLabel(status);
  }

  getStatusLabel(status: ShipmentStatus): string {
    const labels: Record<string, string> = {
      // Shipments
      created: 'Créé',
      assigned: 'Assigné',
      in_transit: 'En transit',
      delivered: 'Livré',
      returned: 'Retourné',
      canceled: 'Annulé',
      // Batches
      planned: 'Planifié',
      in_progress: 'En cours',
      completed: 'Terminé'
    };
    return labels[status] || (status as string);
  }

  getBatchStatusClass(status: BatchStatus): string {
    const classes = {
      'planned': 'badge-soft-warning',
      'in_progress': 'badge-soft-primary',
      'completed': 'badge-soft-success',
      'canceled': 'badge-soft-danger'
    };
    return classes[status] || 'badge-soft-secondary';
  }

  getBatchStatusLabel(status: BatchStatus): string {
    const labels = {
      'planned': 'Planifié',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'canceled': 'Annulé'
    };
    return labels[status] || status;
  }

  getProgressBarClass(percentage: number): string {
    if (typeof (percentage as any) === 'number') {
      const p = percentage;
      if (p >= 80) return 'bg-success';
      if (p >= 50) return 'bg-warning';
      return 'bg-danger';
    }
    // Fallback when a status string is passed from template
    const status = (percentage as unknown as string) || '';
    const map: Record<string, string> = {
      planned: 'bg-warning',
      in_progress: 'bg-primary',
      completed: 'bg-success',
      canceled: 'bg-danger'
    };
    return map[status] || 'bg-secondary';
  }

  // TrackBy functions for performance
  trackByShipment(index: number, shipment: Shipment): string {
    console.log('trackByShipment called with:', { index, shipment, id: shipment.id });
    return shipment.id || index.toString();
  }

  // Alias to match template usage
  trackByShipmentId(index: number, shipment: Shipment): string {
    return this.trackByShipment(index, shipment);
  }

  // Vue détails colis
  viewShipmentDetails(id: string): void {
    if (!id) return;
    this.router.navigate(['/megafast/colis', id]);
  }

  printShipment(sh: Shipment): void {
    // Impression d'une fiche colis depuis le lot (client/driver facultatifs)
    this.shipmentPrintService.generateShipmentPdf(sh).catch(err => {
      console.error('Erreur impression colis:', err);
      this.toastrService.error("Échec de l'impression du colis");
    });
  }

  // Retirer un colis (accepte aussi l'id direct depuis le template)
  removeShipmentFromBatch(id?: string): void {
    const targetId = id ?? this.shipmentToRemove;
    if (targetId && this.batchId$.value) {
      this.shipmentService.unassignFromBatch(targetId).then(() => {
        this.toastrService.success('Colis retiré du lot');
        this.closeRemoveModal();
  this.loadBatchData(this.batchId$.value);
      }).catch((error) => {
        console.error('Erreur lors du retrait du colis:', error);
        this.toastrService.error('Erreur lors du retrait du colis');
      });
    }
  }

  // Rafraîchir la liste des colis
  refreshShipments(): void {
    if (this.batchId$.value) {
      // Réémet l'id pour déclencher les streams dépendants
      this.batchId$.next(this.batchId$.value);
      this.toastrService.info('Liste des colis actualisée');
    }
  }

  // Recalcul des statistiques côté service
  recomputeStats(): void {
    if (!this.batchId$.value) return;
    this.batchService.recomputeStats(this.batchId$.value).then(() => {
      this.toastrService.success('Statistiques recalculées');
      this.refreshShipments();
    }).catch(err => {
      console.error('Erreur recalcul stats:', err);
      this.toastrService.error('Erreur lors du recalcul des stats');
    });
  }

  // Nom du livreur (placeholder; à relier au service de drivers si besoin)
  getDriverName(driverId?: string): string {
    if (!driverId) return '-';
    return this.driverMap.get(driverId) || '-';
  }

  // Pourcentage d'avancement (utilisé par le template)
  getProgressPercentage(batch: Batch | null): number {
    if (!batch) return 0;
    const total = (batch as any).totalShipments ?? this.shipments.length;
    const delivered = (batch as any).deliveredShipments ?? this.shipments.filter(s => s.status === 'delivered').length;
    return total > 0 ? Math.round((delivered / total) * 100) : 0;
  }

  // Jours d'activité du lot (approx.)
  getDaysActive(batch: Batch | null): number {
    if (!batch) return 0;
    const start = (batch as any).createdAt?.toDate ? (batch as any).createdAt.toDate() : new Date();
    const end = new Date();
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }

  // Taux de livraison (%)
  getDeliveryRate(batch: Batch | null): number {
    return this.getProgressPercentage(batch);
  }

  // Stubs pour actions non encore implémentées
  editBatch(): void {
    this.toastrService.info('Édition du lot en développement');
  }
  showFullMap(): void {
    this.toastrService.info('Carte plein écran en développement');
  }
}
