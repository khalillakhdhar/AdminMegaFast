import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { DriverService, ShipmentFilters, CityOption } from '../../../core/services/driver-portal.service';
import { Shipment, ShipmentStatus } from '../../../core/models/shipment.model';
import { ShipmentDetailModalComponent } from './shipment-detail-modal.component';

@Component({
  selector: 'app-driver-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule, ShipmentDetailModalComponent],
  template: `
    <div class="driver-shipments">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Mes Colis</h1>
          <p>Gérez vos colis assignés et mettez à jour leur statut</p>
        </div>
        <div class="header-actions">
          <button class="scan-btn" type="button">
            <i class="fas fa-qrcode"></i>
            Scanner un colis
          </button>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="filters-section">
        <div class="filters-row">
          <div class="filter-group">
            <label>Ville destination</label>
            <select [(ngModel)]="filters.city" (ngModelChange)="onFilterChange()" class="filter-select">
              <option value="">Toutes les villes</option>
              <option *ngFor="let city of availableCities" [value]="city.value">
                {{ city.label }}
              </option>
            </select>
          </div>

          <div class="filter-group">
            <label>Ville départ</label>
            <select [(ngModel)]="filters.pickupCity" (ngModelChange)="onFilterChange()" class="filter-select">
              <option value="">Toutes les villes</option>
              <option *ngFor="let city of availablePickupCities" [value]="city.value">
                {{ city.label }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>Statut</label>
            <select [(ngModel)]="filters.status" (ngModelChange)="onFilterChange()" class="filter-select">
              <option value="">Tous les statuts</option>
              <option value="assigned">Assigné</option>
              <option value="picked_up">Récupéré</option>
              <option value="in_transit">En transit</option>
              <option value="delivered">Livré</option>
              <option value="returned">Retourné</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Code-barres</label>
            <input
              type="text"
              [(ngModel)]="filters.barcode"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Rechercher par code-barres"
              class="filter-input">
          </div>



          <div class="filter-group">
            <label>Client</label>
            <input
              type="text"
              [(ngModel)]="filters.clientName"
              (ngModelChange)="onFilterChange()"
              placeholder="Nom du client"
              class="filter-input">
          </div>

          <div class="filter-group">
            <label>Date début</label>
            <input
              type="date"
              [(ngModel)]="filters.dateFrom"
              (ngModelChange)="onFilterChange()"
              class="filter-input">
          </div>

          <div class="filter-group">
            <label>Date fin</label>
            <input
              type="date"
              [(ngModel)]="filters.dateTo"
              (ngModelChange)="onFilterChange()"
              class="filter-input">
          </div>

          <button class="clear-filters-btn" (click)="clearFilters()" type="button">
            <i class="fas fa-times"></i>
            Effacer
          </button>
        </div>

        <!-- Advanced Filters Toggle -->
        <div class="advanced-filters-toggle">
          <button
            class="toggle-btn"
            (click)="showAdvancedFilters = !showAdvancedFilters"
            type="button">
            <i class="fas" [class.fa-chevron-down]="!showAdvancedFilters" [class.fa-chevron-up]="showAdvancedFilters"></i>
            Filtres avancés
          </button>
        </div>

        <!-- Advanced Filters -->
        <div class="advanced-filters" *ngIf="showAdvancedFilters">
          <div class="filters-row">
            <div class="filter-group">
              <label>Montant minimum</label>
              <input
                type="number"
                [(ngModel)]="filters.amountFrom"
                (ngModelChange)="onFilterChange()"
                placeholder="0"
                class="filter-input">
            </div>

            <div class="filter-group">
              <label>Montant maximum</label>
              <input
                type="number"
                [(ngModel)]="filters.amountTo"
                (ngModelChange)="onFilterChange()"
                placeholder="1000"
                class="filter-input">
            </div>

            <div class="filter-group">
              <label>Délégation destination</label>
              <input
                type="text"
                [(ngModel)]="filters.delegation"
                (ngModelChange)="onFilterChange()"
                placeholder="Délégation"
                class="filter-input">
            </div>

            <div class="filter-group">
              <label>Délégation départ</label>
              <input
                type="text"
                [(ngModel)]="filters.pickupDelegation"
                (ngModelChange)="onFilterChange()"
                placeholder="Délégation"
                class="filter-input">
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="stats-summary" *ngIf="shipments.length > 0">
        <div class="stat-item">
          <span class="stat-label">Total:</span>
          <span class="stat-value">{{ shipments.length }}</span>
        </div>
        <div class="stat-item assigned">
          <span class="stat-label">Assignés:</span>
          <span class="stat-value">{{ getStatusCount('assigned') }}</span>
        </div>
        <div class="stat-item transit">
          <span class="stat-label">En transit:</span>
          <span class="stat-value">{{ getStatusCount('in_transit') }}</span>
        </div>
        <div class="stat-item delivered">
          <span class="stat-label">Livrés:</span>
          <span class="stat-value">{{ getStatusCount('delivered') }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Chargement des colis...</p>
        </div>
      </div>

      <!-- Shipments List -->
      <div class="shipments-container" *ngIf="!isLoading">
        <div class="shipments-list" *ngIf="shipments.length > 0; else noShipments">
          <div class="shipment-card" *ngFor="let shipment of shipments" [class]="shipment.status">
            <div class="shipment-header">
              <div class="shipment-code">
                <i class="fas fa-box"></i>
                <span>{{ shipment.barcode }}</span>
              </div>
              <div class="shipment-status">
                <span class="status-badge" [class]="shipment.status">
                  {{ getStatusLabel(shipment.status) }}
                </span>
              </div>
            </div>

            <div class="shipment-details">
              <div class="detail-row">
                <div class="detail-item">
                  <i class="fas fa-user"></i>
                  <div class="detail-content">
                    <span class="detail-label">Destinataire</span>
                    <span class="detail-value">{{ shipment.clientName || 'Non spécifié' }}</span>
                  </div>
                </div>
                <div class="detail-item">
                  <i class="fas fa-phone"></i>
                  <div class="detail-content">
                    <span class="detail-label">Téléphone</span>
                    <span class="detail-value">{{ shipment.clientPhone || 'Non spécifié' }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-row">
                <div class="detail-item full-width">
                  <i class="fas fa-map-marker-alt"></i>
                  <div class="detail-content">
                    <span class="detail-label">Adresse destination</span>
                    <span class="detail-value">
                      {{ shipment.address || 'Adresse non spécifiée' }}
                      <span *ngIf="shipment.city" class="city-info">
                        - {{ shipment.city }}
                        <span *ngIf="shipment.delegation">({{ shipment.delegation }})</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div class="detail-row" *ngIf="shipment.pickupAddress">
                <div class="detail-item full-width">
                  <i class="fas fa-map-marker"></i>
                  <div class="detail-content">
                    <span class="detail-label">Adresse départ</span>
                    <span class="detail-value">
                      {{ shipment.pickupAddress }}
                      <span *ngIf="shipment.pickupCity" class="city-info">
                        - {{ shipment.pickupCity }}
                        <span *ngIf="shipment.pickupDelegation">({{ shipment.pickupDelegation }})</span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Coordinates Section -->
              <div class="detail-row" *ngIf="shipment.geo">
                <div class="detail-item">
                  <i class="fas fa-location-arrow"></i>
                  <div class="detail-content">
                    <span class="detail-label">Coordonnées GPS</span>
                    <span class="detail-value coordinates">
                      {{ shipment.geo.lat }}, {{ shipment.geo.lng }}
                    </span>
                  </div>
                </div>
                <div class="detail-item">
                  <button
                    class="map-btn"
                    (click)="openInMaps(shipment.geo!)"
                    type="button">
                    <i class="fas fa-external-link-alt"></i>
                    Ouvrir dans Maps
                  </button>
                </div>
              </div>

              <div class="detail-row">
                <div class="detail-item" *ngIf="shipment.amount">
                  <i class="fas fa-money-bill"></i>
                  <div class="detail-content">
                    <span class="detail-label">Montant COD</span>
                    <span class="detail-value amount">{{ formatCurrency(shipment.amount) }}</span>
                  </div>
                </div>
                <div class="detail-item" *ngIf="shipment.weight">
                  <i class="fas fa-weight"></i>
                  <div class="detail-content">
                    <span class="detail-label">Poids</span>
                    <span class="detail-value">{{ shipment.weight }} kg</span>
                  </div>
                </div>
                <div class="detail-item">
                  <i class="fas fa-calendar"></i>
                  <div class="detail-content">
                    <span class="detail-label">Créé le</span>
                    <span class="detail-value">{{ formatDate(shipment.createdAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-row" *ngIf="shipment.notes">
                <div class="detail-item full-width">
                  <i class="fas fa-sticky-note"></i>
                  <div class="detail-content">
                    <span class="detail-label">Notes</span>
                    <span class="detail-value notes">{{ shipment.notes }}</span>
                  </div>
                </div>
              </div>

              <div class="detail-row" *ngIf="shipment.batchId">
                <div class="detail-item">
                  <i class="fas fa-layer-group"></i>
                  <div class="detail-content">
                    <span class="detail-label">Lot</span>
                    <span class="detail-value batch-id">{{ shipment.batchId }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="shipment-actions">
              <button
                class="action-btn pickup"
                *ngIf="shipment.status === 'assigned'"
                (click)="updateStatus(shipment.id!, 'picked_up')"
                type="button">
                <i class="fas fa-hand-paper"></i>
                Récupérer
              </button>

              <button
                class="action-btn transit"
                *ngIf="shipment.status === 'picked_up'"
                (click)="updateStatus(shipment.id!, 'in_transit')"
                type="button">
                <i class="fas fa-truck"></i>
                En transit
              </button>

              <button
                class="action-btn deliver"
                *ngIf="shipment.status === 'in_transit'"
                (click)="updateStatus(shipment.id!, 'delivered')"
                type="button">
                <i class="fas fa-check"></i>
                Livrer
              </button>

              <button
                class="action-btn return"
                *ngIf="['picked_up', 'in_transit'].includes(shipment.status)"
                (click)="updateStatus(shipment.id!, 'returned')"
                type="button">
                <i class="fas fa-undo"></i>
                Retourner
              </button>

              <button
                class="action-btn details"
                (click)="viewShipmentDetails(shipment)"
                type="button">
                <i class="fas fa-info-circle"></i>
                Détails
              </button>
            </div>
          </div>
        </div>

        <ng-template #noShipments>
          <div class="empty-state">
            <i class="fas fa-box-open"></i>
            <h2>Aucun colis trouvé</h2>
            <p>Aucun colis ne correspond à vos critères de recherche.</p>
            <button class="clear-filters-btn" (click)="clearFilters()" type="button">
              Effacer les filtres
            </button>
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Shipment Detail Modal -->
    <app-shipment-detail-modal
      [shipment]="selectedShipment"
      [isVisible]="isDetailModalVisible"
      (closeEvent)="closeDetailModal()">
    </app-shipment-detail-modal>
  `,
  styleUrls: ['./driver-shipments.component.scss']
})
export class DriverShipmentsComponent implements OnInit, OnDestroy {
  shipments: Shipment[] = [];
  isLoading = true;
  showAdvancedFilters = false;
  availableCities: CityOption[] = [];
  availablePickupCities: CityOption[] = [];

  // Modal properties
  selectedShipment: Shipment | null = null;
  isDetailModalVisible = false;

  filters = {
    status: '',
    barcode: '',
    dateFrom: '',
    dateTo: '',
    batchId: '',
    city: '',
    delegation: '',
    pickupCity: '',
    pickupDelegation: '',
    clientName: '',
    amountFrom: null as number | null,
    amountTo: null as number | null
  };

  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  constructor(
    private readonly driverService: DriverService
  ) {
    // Setup search with debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.barcode = searchTerm;
      this.loadShipments();
    });
  }

  ngOnInit(): void {
    this.loadCities();
    this.loadShipments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCities(): void {
    this.driverService.getAvailableCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cities) => {
          // Separate destination and pickup cities
          this.availableCities = cities.filter(city => !city.label.includes('(départ)'));
          this.availablePickupCities = cities.filter(city => city.label.includes('(départ)'));
        },
        error: (error) => {
          console.error('Erreur lors du chargement des villes:', error);
        }
      });
  }

  loadShipments(): void {
    this.isLoading = true;

    // Convert form values to proper filter types
    const filterParams: ShipmentFilters = {};

    if (this.filters.status && this.filters.status !== '') {
      filterParams.status = this.filters.status as ShipmentStatus;
    }
    if (this.filters.barcode) {
      filterParams.barcode = this.filters.barcode;
    }
    if (this.filters.city) {
      filterParams.city = this.filters.city;
    }
    if (this.filters.delegation) {
      filterParams.delegation = this.filters.delegation;
    }
    if (this.filters.pickupCity) {
      filterParams.pickupCity = this.filters.pickupCity;
    }
    if (this.filters.pickupDelegation) {
      filterParams.pickupDelegation = this.filters.pickupDelegation;
    }
    if (this.filters.clientName) {
      filterParams.clientName = this.filters.clientName;
    }
    if (this.filters.batchId) {
      filterParams.batchId = this.filters.batchId;
    }
    if (this.filters.dateFrom) {
      filterParams.dateFrom = new Date(this.filters.dateFrom);
    }
    if (this.filters.dateTo) {
      filterParams.dateTo = new Date(this.filters.dateTo);
    }
    if (this.filters.amountFrom !== null) {
      filterParams.amountFrom = this.filters.amountFrom;
    }
    if (this.filters.amountTo !== null) {
      filterParams.amountTo = this.filters.amountTo;
    }

    this.driverService.getFilteredShipments(filterParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shipments) => {
          this.shipments = shipments;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des colis:', error);
          this.isLoading = false;
        }
      });
  }

  onFilterChange(): void {
    this.loadShipments();
  }

  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }

  clearFilters(): void {
    this.filters = {
      status: '',
      barcode: '',
      dateFrom: '',
      dateTo: '',
      batchId: '',
      city: '',
      delegation: '',
      pickupCity: '',
      pickupDelegation: '',
      clientName: '',
      amountFrom: null,
      amountTo: null
    };
    this.loadShipments();
  }

  async updateStatus(shipmentId: string, newStatus: ShipmentStatus): Promise<void> {
    try {
      await this.driverService.updateShipmentStatus(shipmentId, newStatus);
      this.loadShipments(); // Reload to get updated data
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }

  getStatusCount(status: string): number {
    return this.shipments.filter(s => s.status === status).length;
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

  openInMaps(coordinates: { lat: number; lng: number }): void {
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
    window.open(url, '_blank');
  }

  viewShipmentDetails(shipment: Shipment): void {
    this.selectedShipment = shipment;
    this.isDetailModalVisible = true;
  }

  closeDetailModal(): void {
    this.isDetailModalVisible = false;
    this.selectedShipment = null;
  }
}
