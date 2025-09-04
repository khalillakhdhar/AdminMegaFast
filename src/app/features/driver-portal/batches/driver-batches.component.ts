import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DriverService, BatchStatistics } from '../../../core/services/driver-portal.service';
import { Batch } from '../../../core/models/batch.model';
import { PieChartComponent, PieChartData } from '../../../shared/components/pie-chart.component';
import { BatchDetailModalComponent } from './batch-detail-modal.component';

@Component({
  selector: 'app-driver-batches',
  standalone: true,
  imports: [CommonModule, FormsModule, PieChartComponent, BatchDetailModalComponent],
  template: `
    <div class="driver-batches">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Mes Lots</h1>
          <p>Gérez vos lots de livraison et suivez leur progression</p>
        </div>
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-value">{{ batches.length }}</span>
            <span class="stat-label">Total lots</span>
          </div>
          <div class="stat-item active">
            <span class="stat-value">{{ getStatusCount('active') + getStatusCount('in_progress') }}</span>
            <span class="stat-label">Actifs</span>
          </div>
        </div>
      </div>

      <!-- Statistics Section -->
      <div class="statistics-section" *ngIf="batchStatistics">
        <div class="stats-header">
          <h2>Statistiques de livraison</h2>
          <p>Aperçu de vos performances</p>
        </div>

        <div class="stats-grid">
          <!-- Delivery Rate Pie Chart -->
          <div class="stat-card">
            <h3>Taux de livraison</h3>
            <app-pie-chart
              [data]="deliveryRateData"
              centerLabel="Colis">
            </app-pie-chart>
          </div>

          <!-- Batch Status Pie Chart -->
          <div class="stat-card">
            <h3>État des lots</h3>
            <app-pie-chart
              [data]="batchStatusData"
              centerLabel="Lots">
            </app-pie-chart>
          </div>

          <!-- Revenue Distribution Pie Chart -->
          <div class="stat-card">
            <h3>Répartition des revenus</h3>
            <app-pie-chart
              [data]="revenueData"
              centerLabel="TND">
            </app-pie-chart>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Statut</label>
          <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()" class="filter-select">
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Chargement des lots...</p>
        </div>
      </div>

      <!-- Batches List -->
      <div class="batches-container" *ngIf="!isLoading">
        <div class="batches-list" *ngIf="batches.length > 0; else noBatches">
          <div class="batch-card" *ngFor="let batch of batches" [class]="batch.status">
            <div class="batch-header">
              <div class="batch-info">
                <h3 class="batch-name">{{ batch.name }}</h3>
                <span class="batch-id">ID: {{ batch.id }}</span>
              </div>
              <div class="batch-status">
                <span class="status-badge" [class]="batch.status">
                  {{ getStatusLabel(batch.status) }}
                </span>
              </div>
            </div>

            <div class="batch-details">
              <div class="details-grid">
                <div class="detail-item">
                  <i class="fas fa-box"></i>
                  <div class="detail-content">
                    <span class="detail-label">Colis total</span>
                    <span class="detail-value">{{ batch.totalShipments || 0 }}</span>
                  </div>
                </div>

                <div class="detail-item">
                  <i class="fas fa-check-circle"></i>
                  <div class="detail-content">
                    <span class="detail-label">Livrés</span>
                    <span class="detail-value delivered">{{ batch.deliveredShipments || 0 }}</span>
                  </div>
                </div>

                <div class="detail-item">
                  <i class="fas fa-truck"></i>
                  <div class="detail-content">
                    <span class="detail-label">En transit</span>
                    <span class="detail-value transit">{{ getInTransitCount(batch) }}</span>
                  </div>
                </div>

                <div class="detail-item">
                  <i class="fas fa-money-bill-wave"></i>
                  <div class="detail-content">
                    <span class="detail-label">Montant total</span>
                    <span class="detail-value amount">{{ formatCurrency(batch.totalAmount || 0) }}</span>
                  </div>
                </div>

                <div class="detail-item">
                  <i class="fas fa-calendar"></i>
                  <div class="detail-content">
                    <span class="detail-label">Créé le</span>
                    <span class="detail-value">{{ formatDate(batch.createdAt) }}</span>
                  </div>
                </div>

                <div class="detail-item" *ngIf="batch.plannedAt">
                  <i class="fas fa-clock"></i>
                  <div class="detail-content">
                    <span class="detail-label">Planifié le</span>
                    <span class="detail-value">{{ formatDateTime(batch.plannedAt) }}</span>
                  </div>
                </div>

                <div class="detail-item" *ngIf="batch.startedAt">
                  <i class="fas fa-play"></i>
                  <div class="detail-content">
                    <span class="detail-label">Commencé le</span>
                    <span class="detail-value">{{ formatDateTime(batch.startedAt) }}</span>
                  </div>
                </div>

                <div class="detail-item" *ngIf="batch.completedAt">
                  <i class="fas fa-flag-checkered"></i>
                  <div class="detail-content">
                    <span class="detail-label">Terminé le</span>
                    <span class="detail-value">{{ formatDateTime(batch.completedAt) }}</span>
                  </div>
                </div>
              </div>

              <!-- Batch Code and Statistics -->
              <div class="batch-code-section" *ngIf="batch.code">
                <div class="detail-item">
                  <i class="fas fa-barcode"></i>
                  <div class="detail-content">
                    <span class="detail-label">Code lot</span>
                    <span class="detail-value code">{{ batch.code }}</span>
                  </div>
                </div>
              </div>

              <div class="batch-description" *ngIf="batch.description">
                <i class="fas fa-info-circle"></i>
                <p>{{ batch.description }}</p>
              </div>
            </div>

            <div class="batch-actions">
              <button
                class="action-btn start"
                *ngIf="batch.status === 'active'"
                (click)="startBatch(batch.id!)"
                type="button">
                <i class="fas fa-play"></i>
                Commencer le lot
              </button>

              <button
                class="action-btn continue"
                *ngIf="batch.status === 'in_progress'"
                type="button">
                <i class="fas fa-route"></i>
                Continuer livraison
              </button>

              <button
                class="action-btn complete"
                *ngIf="batch.status === 'in_progress'"
                (click)="completeBatch(batch.id!)"
                type="button">
                <i class="fas fa-check"></i>
                Terminer le lot
              </button>

              <button
                class="action-btn view"
                (click)="viewBatchShipments(batch.id!)"
                type="button">
                <i class="fas fa-eye"></i>
                Voir les colis
              </button>

              <button
                class="action-btn details"
                type="button">
                <i class="fas fa-info-circle"></i>
                Détails
              </button>
            </div>

            <!-- Progress Bar for in-progress batches -->
            <div class="batch-progress" *ngIf="batch.status === 'in_progress'">
              <div class="progress-info">
                <span>Progression</span>
                <span>{{ getProgressPercentage(batch) }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="getProgressPercentage(batch)"></div>
              </div>
            </div>
          </div>
        </div>

        <ng-template #noBatches>
          <div class="empty-state">
            <i class="fas fa-layer-group"></i>
            <h2>Aucun lot trouvé</h2>
            <p>Aucun lot ne correspond à vos critères de recherche.</p>
            <button class="clear-filter-btn" (click)="clearFilter()" type="button">
              Afficher tous les lots
            </button>
          </div>
        </ng-template>
      </div>

      <!-- Batch Detail Modal -->
      <app-batch-detail-modal
        [isVisible]="showBatchModal"
        [batchId]="selectedBatchId"
        (closeModal)="closeBatchModal()"
        (batchCompleted)="onBatchCompleted()">
      </app-batch-detail-modal>
    </div>
  `,
  styleUrls: ['./driver-batches.component.scss']
})
export class DriverBatchesComponent implements OnInit, OnDestroy {
  batches: Batch[] = [];
  isLoading = true;
  statusFilter = '';
  batchStatistics: BatchStatistics | null = null;

  // Pie chart data
  deliveryRateData: PieChartData[] = [];
  batchStatusData: PieChartData[] = [];
  revenueData: PieChartData[] = [];

  // Modal state
  showBatchModal = false;
  selectedBatchId: string | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly driverService: DriverService
  ) {}

  ngOnInit(): void {
    this.loadBatches();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBatches(): void {
    this.isLoading = true;

    this.driverService.getDriverBatches(this.statusFilter || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batches) => {
          this.batches = batches;
          this.isLoading = false;
          this.calculateRealTimeStatistics();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des lots:', error);
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.driverService.getBatchStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.batchStatistics = stats;
          this.updatePieChartData();
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
        }
      });
  }

  calculateRealTimeStatistics(): void {
    // Calculate statistics from current batches
    const totalShipments = this.batches.reduce((sum, batch) => sum + (batch.totalShipments || 0), 0);
    const deliveredShipments = this.batches.reduce((sum, batch) => sum + (batch.deliveredShipments || 0), 0);
    const totalAmount = this.batches.reduce((sum, batch) => sum + (batch.totalAmount || 0), 0);
    const deliveredAmount = this.batches.reduce((sum, batch) => {
      const delivered = batch.deliveredShipments || 0;
      const total = batch.totalShipments || 1;
      return sum + ((batch.totalAmount || 0) * (delivered / total));
    }, 0);

    // Calculate other statistics
    const inTransitShipments = Math.floor(totalShipments * 0.3); // Simulate in-transit
    const returnedShipments = Math.floor(totalShipments * 0.1); // Simulate returned
    const pendingShipments = totalShipments - deliveredShipments - inTransitShipments - returnedShipments;

    this.batchStatistics = {
      totalShipments,
      deliveredShipments,
      inTransitShipments,
      returnedShipments,
      pendingShipments,
      deliveryRate: totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0,
      totalAmount,
      deliveredAmount
    };

    this.updatePieChartData();
  }

  updatePieChartData(): void {
    if (!this.batchStatistics) return;

    // Delivery Rate Data
    const delivered = this.batchStatistics.deliveredShipments;
    const pending = this.batchStatistics.totalShipments - delivered;
    const inTransit = Math.max(0, pending - Math.floor(pending * 0.3)); // Simulate in-transit
    const returned = pending - inTransit;

    this.deliveryRateData = [
      {
        label: 'Livrés',
        value: delivered,
        color: '#10b981',
        percentage: Math.round((delivered / this.batchStatistics.totalShipments) * 100)
      },
      {
        label: 'En transit',
        value: inTransit,
        color: '#f59e0b',
        percentage: Math.round((inTransit / this.batchStatistics.totalShipments) * 100)
      },
      {
        label: 'Retournés',
        value: returned,
        color: '#ef4444',
        percentage: Math.round((returned / this.batchStatistics.totalShipments) * 100)
      }
    ].filter(item => item.value > 0);

    // Batch Status Data
    const activeBatches = this.getStatusCount('active');
    const inProgressBatches = this.getStatusCount('in_progress');
    const completedBatches = this.getStatusCount('completed');
    const totalBatches = this.batches.length;

    this.batchStatusData = [
      {
        label: 'Actifs',
        value: activeBatches,
        color: '#3b82f6',
        percentage: totalBatches > 0 ? Math.round((activeBatches / totalBatches) * 100) : 0
      },
      {
        label: 'En cours',
        value: inProgressBatches,
        color: '#f59e0b',
        percentage: totalBatches > 0 ? Math.round((inProgressBatches / totalBatches) * 100) : 0
      },
      {
        label: 'Terminés',
        value: completedBatches,
        color: '#10b981',
        percentage: totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0
      }
    ].filter(item => item.value > 0);

    // Revenue Data
    const deliveredRevenue = this.batchStatistics.deliveredAmount;
    const pendingRevenue = this.batchStatistics.totalAmount - deliveredRevenue;

    this.revenueData = [
      {
        label: 'Revenus livrés',
        value: Math.round(deliveredRevenue),
        color: '#10b981',
        percentage: this.batchStatistics.totalAmount > 0 ? Math.round((deliveredRevenue / this.batchStatistics.totalAmount) * 100) : 0
      },
      {
        label: 'Revenus en attente',
        value: Math.round(pendingRevenue),
        color: '#f59e0b',
        percentage: this.batchStatistics.totalAmount > 0 ? Math.round((pendingRevenue / this.batchStatistics.totalAmount) * 100) : 0
      }
    ].filter(item => item.value > 0);
  }

  onFilterChange(): void {
    this.loadBatches();
  }

  clearFilter(): void {
    this.statusFilter = '';
    this.loadBatches();
  }

  async startBatch(batchId: string): Promise<void> {
    try {
      await this.driverService.startBatchDelivery(batchId);
      this.loadBatches(); // Reload to get updated data
    } catch (error) {
      console.error('Erreur lors du démarrage du lot:', error);
    }
  }

  async completeBatch(batchId: string): Promise<void> {
    try {
      await this.driverService.completeBatchDelivery(batchId);
      this.loadBatches(); // Reload to get updated data
    } catch (error) {
      console.error('Erreur lors de la finalisation du lot:', error);
      // Show error message to user
      alert('Erreur: Tous les colis du lot doivent être livrés ou retournés avant de pouvoir terminer le lot.');
    }
  }

  getStatusCount(status: string): number {
    return this.batches.filter(b => b.status === status).length;
  }

  getStatusLabel(status: string | undefined): string {
    const labels: { [key: string]: string } = {
      'active': 'Actif',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    return labels[status || ''] || status || 'Inconnu';
  }

  getProgressPercentage(batch: Batch): number {
    if (!batch.totalShipments || batch.totalShipments === 0) return 0;
    const delivered = batch.deliveredShipments || 0;
    return Math.round((delivered / batch.totalShipments) * 100);
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('fr-FR');
  }

  formatDateTime(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND'
    }).format(amount);
  }

  getInTransitCount(batch: Batch): number {
    // This would need to be calculated from actual shipments
    // For now, return a calculated value
    return Math.max(0, (batch.totalShipments || 0) - (batch.deliveredShipments || 0));
  }

  viewBatchShipments(batchId: string): void {
    this.selectedBatchId = batchId;
    this.showBatchModal = true;
  }

  closeBatchModal(): void {
    this.showBatchModal = false;
    this.selectedBatchId = null;
  }

  onBatchCompleted(): void {
    this.loadBatches(); // Reload batches to reflect changes
    this.loadStatistics(); // Reload statistics
  }
}
