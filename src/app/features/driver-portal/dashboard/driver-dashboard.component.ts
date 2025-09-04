import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DriverService, DriverDashboardData } from '../../../core/services/driver-portal.service';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="driver-dashboard">
      <!-- Page Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <h1>Tableau de bord Livreur</h1>
          <p>Bienvenue! Voici un aperçu de vos livraisons aujourd'hui.</p>
        </div>
        <div class="header-actions">
          <button class="scan-btn" type="button">
            <i class="fas fa-qrcode"></i>
            Scanner un colis
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Chargement de vos données...</p>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div class="dashboard-content" *ngIf="!isLoading && dashboardData">
        <!-- Statistics Cards -->
        <div class="stats-grid">
          <div class="stat-card total">
            <div class="stat-icon">
              <i class="fas fa-box"></i>
            </div>
            <div class="stat-content">
              <h3>{{ dashboardData.stats.totalShipments }}</h3>
              <p>Total Colis</p>
              <span class="stat-trend">
                <i class="fas fa-arrow-up"></i>
                +12% ce mois
              </span>
            </div>
          </div>

          <div class="stat-card pending">
            <div class="stat-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="stat-content">
              <h3>{{ dashboardData.stats.pendingShipments }}</h3>
              <p>En attente</p>
              <span class="stat-action">À traiter</span>
            </div>
          </div>

          <div class="stat-card transit">
            <div class="stat-icon">
              <i class="fas fa-truck"></i>
            </div>
            <div class="stat-content">
              <h3>{{ dashboardData.stats.inTransitShipments }}</h3>
              <p>En transit</p>
              <span class="stat-action">En cours</span>
            </div>
          </div>

          <div class="stat-card delivered">
            <div class="stat-icon">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
              <h3>{{ dashboardData.stats.deliveredShipments }}</h3>
              <p>Livrés</p>
              <span class="stat-trend">
                <i class="fas fa-arrow-up"></i>
                {{ dashboardData.stats.deliveryRate }}%
              </span>
            </div>
          </div>

          <div class="stat-card revenue">
            <div class="stat-icon">
              <i class="fas fa-dollar-sign"></i>
            </div>
            <div class="stat-content">
              <h3>{{ formatCurrency(dashboardData.stats.totalRevenue) }}</h3>
              <p>Revenus</p>
              <span class="stat-trend">
                <i class="fas fa-arrow-up"></i>
                Ce mois
              </span>
            </div>
          </div>

          <div class="stat-card batches">
            <div class="stat-icon">
              <i class="fas fa-layer-group"></i>
            </div>
            <div class="stat-content">
              <h3>{{ dashboardData.stats.activeBatches }}</h3>
              <p>Lots actifs</p>
              <span class="stat-action">{{ dashboardData.stats.totalBatches }} total</span>
            </div>
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="content-grid">
          <!-- Today's Deliveries -->
          <div class="content-card today-deliveries">
            <div class="card-header">
              <h2>
                <i class="fas fa-calendar-day"></i>
                Livraisons d'aujourd'hui
              </h2>
              <span class="count-badge">{{ dashboardData.todayDeliveries.length }}</span>
            </div>
            <div class="card-content">
              <div class="delivery-list" *ngIf="dashboardData.todayDeliveries.length > 0; else noDeliveries">
                <div class="delivery-item" *ngFor="let delivery of dashboardData.todayDeliveries">
                  <div class="delivery-info">
                    <span class="delivery-code">{{ delivery.barcode }}</span>
                    <span class="delivery-address">{{ delivery.receiverAddress }}</span>
                  </div>
                  <div class="delivery-status">
                    <span class="status-badge delivered">Livré</span>
                    <span class="delivery-time">{{ formatTime(delivery.deliveredAt) }}</span>
                  </div>
                </div>
              </div>
              <ng-template #noDeliveries>
                <div class="empty-state">
                  <i class="fas fa-calendar-check"></i>
                  <p>Aucune livraison effectuée aujourd'hui</p>
                </div>
              </ng-template>
            </div>
          </div>

          <!-- Recent Shipments -->
          <div class="content-card recent-shipments">
            <div class="card-header">
              <h2>
                <i class="fas fa-history"></i>
                Colis récents
              </h2>
              <button class="view-all-btn" (click)="navigateToShipments()">
                Voir tout
              </button>
            </div>
            <div class="card-content">
              <div class="shipment-list" *ngIf="dashboardData.recentShipments.length > 0; else noShipments">
                <div class="shipment-item" *ngFor="let shipment of dashboardData.recentShipments">
                  <div class="shipment-icon">
                    <i class="fas fa-box" [class]="getShipmentIconClass(shipment.status)"></i>
                  </div>
                  <div class="shipment-info">
                    <span class="shipment-code">{{ shipment.barcode }}</span>
                    <span class="shipment-receiver">{{ shipment.receiverName }}</span>
                    <span class="shipment-date">{{ formatDate(shipment.createdAt) }}</span>
                  </div>
                  <div class="shipment-status">
                    <span class="status-badge" [class]="shipment.status">
                      {{ getStatusLabel(shipment.status) }}
                    </span>
                  </div>
                </div>
              </div>
              <ng-template #noShipments>
                <div class="empty-state">
                  <i class="fas fa-box-open"></i>
                  <p>Aucun colis assigné</p>
                </div>
              </ng-template>
            </div>
          </div>

          <!-- Active Batches -->
          <div class="content-card active-batches">
            <div class="card-header">
              <h2>
                <i class="fas fa-layer-group"></i>
                Lots actifs
              </h2>
              <button class="view-all-btn" (click)="navigateToBatches()">
                Gérer
              </button>
            </div>
            <div class="card-content">
              <div class="batch-list" *ngIf="dashboardData.activeBatches.length > 0; else noBatches">
                <div class="batch-item" *ngFor="let batch of dashboardData.activeBatches">
                  <div class="batch-info">
                    <span class="batch-name">{{ batch.name }}</span>
                    <span class="batch-count">{{ batch.shipmentsCount }} colis</span>
                    <span class="batch-date">{{ formatDate(batch.createdAt) }}</span>
                  </div>
                  <div class="batch-actions">
                    <button class="action-btn start" *ngIf="batch.status === 'active'" type="button">
                      <i class="fas fa-play"></i>
                      Commencer
                    </button>
                    <button class="action-btn continue" *ngIf="batch.status === 'in_progress'" type="button">
                      <i class="fas fa-route"></i>
                      Continuer
                    </button>
                  </div>
                </div>
              </div>
              <ng-template #noBatches>
                <div class="empty-state">
                  <i class="fas fa-layer-group"></i>
                  <p>Aucun lot actif</p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-section">
          <h2>Actions rapides</h2>
          <div class="actions-grid">
            <button class="quick-action-btn scan" type="button">
              <div class="action-icon">
                <i class="fas fa-qrcode"></i>
              </div>
              <div class="action-content">
                <h3>Scanner un colis</h3>
                <p>Mettre à jour le statut rapidement</p>
              </div>
            </button>

            <button class="quick-action-btn update" type="button" (click)="navigateToShipments()">
              <div class="action-icon">
                <i class="fas fa-edit"></i>
              </div>
              <div class="action-content">
                <h3>Mettre à jour</h3>
                <p>Modifier le statut d'un colis</p>
              </div>
            </button>

            <button class="quick-action-btn route" type="button" (click)="navigateToRoutes()">
              <div class="action-icon">
                <i class="fas fa-route"></i>
              </div>
              <div class="action-content">
                <h3>Itinéraires</h3>
                <p>Optimiser vos livraisons</p>
              </div>
            </button>

            <button class="quick-action-btn stats" type="button" (click)="navigateToStatistics()">
              <div class="action-icon">
                <i class="fas fa-chart-bar"></i>
              </div>
              <div class="action-content">
                <h3>Statistiques</h3>
                <p>Voir vos performances</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-container" *ngIf="!isLoading && !dashboardData">
        <div class="error-content">
          <i class="fas fa-exclamation-triangle"></i>
          <h2>Erreur de chargement</h2>
          <p>Impossible de charger les données du tableau de bord</p>
          <button class="retry-btn" (click)="loadDashboardData()" type="button">
            <i class="fas fa-redo"></i>
            Réessayer
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./driver-dashboard.component.scss']
})
export class DriverDashboardComponent implements OnInit, OnDestroy {
  dashboardData: DriverDashboardData | null = null;
  isLoading = true;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly driverService: DriverService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    this.driverService.getDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du tableau de bord:', error);
          this.isLoading = false;
        }
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('fr-FR');
  }

  formatTime(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'assigned': 'Assigné',
      'picked_up': 'Récupéré',
      'in_transit': 'En transit',
      'delivered': 'Livré',
      'returned': 'Retourné',
      'cancelled': 'Annulé'
    };
    return labels[status] || status;
  }

  getShipmentIconClass(status: string): string {
    const classes: { [key: string]: string } = {
      'pending': 'pending',
      'assigned': 'assigned',
      'picked_up': 'picked-up',
      'in_transit': 'in-transit',
      'delivered': 'delivered',
      'returned': 'returned',
      'cancelled': 'cancelled'
    };
    return classes[status] || '';
  }

  navigateToShipments(): void {
    this.router.navigate(['/driver/shipments']);
  }

  navigateToBatches(): void {
    this.router.navigate(['/driver/batches']);
  }

  navigateToRoutes(): void {
    this.router.navigate(['/driver/routes']);
  }

  navigateToStatistics(): void {
    this.router.navigate(['/driver/statistics']);
  }
}
