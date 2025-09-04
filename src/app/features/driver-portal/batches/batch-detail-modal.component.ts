import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DriverService } from '../../../core/services/driver-portal.service';
import { Batch } from '../../../core/models/batch.model';
import { Shipment } from '../../../core/models/shipment.model';
import { PieChartComponent, PieChartData } from '../../../shared/components/pie-chart.component';

@Component({
  selector: 'app-batch-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PieChartComponent],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="onOverlayClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="modal-header">
          <div class="header-content">
            <h2>{{ batch?.name || 'Détails du lot' }}</h2>
            <p>{{ shipments.length }} colis • {{ getDeliveredCount() }} livrés</p>
          </div>
          <button class="close-btn" (click)="close()" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Batch Statistics -->
        <div class="batch-stats" *ngIf="batch">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon delivered">
                <i class="fas fa-check-circle"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ getDeliveredCount() }}</span>
                <span class="stat-label">Livrés</span>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon in-transit">
                <i class="fas fa-truck"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ getInTransitCount() }}</span>
                <span class="stat-label">En transit</span>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon pending">
                <i class="fas fa-clock"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ getPendingCount() }}</span>
                <span class="stat-label">En attente</span>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon revenue">
                <i class="fas fa-money-bill-wave"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">{{ formatCurrency(getTotalRevenue()) }}</span>
                <span class="stat-label">Revenus</span>
              </div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-section">
            <div class="progress-info">
              <span>Progression du lot</span>
              <span>{{ getProgressPercentage() }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="getProgressPercentage()"></div>
            </div>
          </div>

          <!-- Pie Chart -->
          <div class="chart-section" *ngIf="chartData.length > 0">
            <h3>Répartition des colis</h3>
            <app-pie-chart [data]="chartData" centerLabel="Colis"></app-pie-chart>
          </div>
        </div>

        <!-- Shipments List -->
        <div class="modal-body">
          <div class="shipments-header">
            <h3>Liste des colis ({{ shipments.length }})</h3>
            <div class="filters">
              <select [(ngModel)]="statusFilter" (ngModelChange)="filterShipments()" class="status-filter">
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="in_transit">En transit</option>
                <option value="out_for_delivery">En livraison</option>
                <option value="delivered">Livré</option>
                <option value="returned">Retourné</option>
              </select>
            </div>
          </div>

          <div class="shipments-list" *ngIf="filteredShipments.length > 0; else noShipments">
            <div class="shipment-item" *ngFor="let shipment of filteredShipments" [class]="shipment.status">
              <div class="shipment-header">
                <div class="shipment-info">
                  <span class="shipment-barcode">{{ shipment.barcode }}</span>
                  <span class="shipment-client">{{ shipment.clientName || 'Client non spécifié' }}</span>
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
                    <i class="fas fa-map-marker-alt"></i>
                    <span>{{ shipment.deliveryAddress || 'Adresse non spécifiée' }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>{{ shipment.clientPhone || 'Téléphone non spécifié' }}</span>
                  </div>
                </div>
                <div class="detail-row">
                  <div class="detail-item">
                    <i class="fas fa-money-bill"></i>
                    <span>{{ formatCurrency(shipment.amount || 0) }}</span>
                  </div>
                  <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>{{ formatDate(shipment.createdAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="shipment-actions" *ngIf="shipment.status !== 'delivered'">
                <button
                  class="action-btn deliver"
                  *ngIf="shipment.status === 'out_for_delivery'"
                  (click)="markAsDelivered(shipment.id!)"
                  type="button">
                  <i class="fas fa-check"></i>
                  Marquer livré
                </button>
                <button
                  class="action-btn transit"
                  *ngIf="shipment.status === 'pending'"
                  (click)="markInTransit(shipment.id!)"
                  type="button">
                  <i class="fas fa-truck"></i>
                  En transit
                </button>
              </div>
            </div>
          </div>

          <ng-template #noShipments>
            <div class="empty-state">
              <i class="fas fa-box-open"></i>
              <p>Aucun colis trouvé pour ce lot</p>
            </div>
          </ng-template>
        </div>

        <!-- Modal Footer -->
        <div class="modal-footer">
          <button class="btn-secondary" (click)="close()" type="button">
            Fermer
          </button>
          <button
            class="btn-primary"
            *ngIf="batch?.status === 'in_progress'"
            (click)="completeBatch()"
            [disabled]="!canCompleteBatch()"
            type="button">
            <i class="fas fa-flag-checkered"></i>
            Terminer le lot
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;

      .header-content {
        h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        p {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 20px;
        color: #6b7280;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.2s ease;

        &:hover {
          background: #f3f4f6;
          color: #374151;
        }
      }
    }

    .batch-stats {
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
      background: #f8fafc;

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;

        .stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;

          .stat-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;

            &.delivered {
              background: #d1fae5;
              color: #059669;
            }
            &.in-transit {
              background: #fef3c7;
              color: #d97706;
            }
            &.pending {
              background: #dbeafe;
              color: #2563eb;
            }
            &.revenue {
              background: #f3e8ff;
              color: #7c3aed;
            }
          }

          .stat-info {
            display: flex;
            flex-direction: column;

            .stat-value {
              font-size: 18px;
              font-weight: 700;
              color: #1f2937;
            }

            .stat-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
            }
          }
        }
      }

      .progress-section {
        margin-bottom: 24px;

        .progress-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #059669 0%, #10b981 100%);
            transition: width 0.3s ease;
          }
        }
      }

      .chart-section {
        h3 {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 16px 0;
          text-align: center;
        }
      }
    }

    .modal-body {
      flex: 1;
      overflow: auto;
      padding: 24px;

      .shipments-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h3 {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .status-filter {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: white;
        }
      }

      .shipments-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .shipment-item {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s ease;

          &:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          &.delivered {
            border-left: 4px solid #059669;
          }
          &.in_transit, &.out_for_delivery {
            border-left: 4px solid #d97706;
          }
          &.pending {
            border-left: 4px solid #2563eb;
          }
          &.returned {
            border-left: 4px solid #dc2626;
          }

          .shipment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;

            .shipment-info {
              display: flex;
              flex-direction: column;
              gap: 4px;

              .shipment-barcode {
                font-weight: 600;
                color: #1f2937;
              }

              .shipment-client {
                font-size: 14px;
                color: #6b7280;
              }
            }

            .status-badge {
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;

              &.delivered {
                background: #d1fae5;
                color: #059669;
              }
              &.in_transit, &.out_for_delivery {
                background: #fef3c7;
                color: #d97706;
              }
              &.pending {
                background: #dbeafe;
                color: #2563eb;
              }
              &.returned {
                background: #fee2e2;
                color: #dc2626;
              }
            }
          }

          .shipment-details {
            margin-bottom: 12px;

            .detail-row {
              display: flex;
              gap: 24px;
              margin-bottom: 8px;

              .detail-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: #6b7280;

                i {
                  color: #9ca3af;
                  width: 16px;
                }
              }
            }
          }

          .shipment-actions {
            display: flex;
            gap: 8px;

            .action-btn {
              padding: 6px 12px;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 4px;
              transition: all 0.2s ease;

              &.deliver {
                background: #059669;
                color: white;

                &:hover {
                  background: #047857;
                }
              }

              &.transit {
                background: #d97706;
                color: white;

                &:hover {
                  background: #b45309;
                }
              }
            }
          }
        }
      }

      .empty-state {
        text-align: center;
        padding: 40px;
        color: #6b7280;

        i {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        p {
          font-size: 16px;
          margin: 0;
        }
      }
    }

    .modal-footer {
      padding: 20px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: #f8fafc;

      .btn-secondary {
        padding: 10px 20px;
        border: 1px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #f3f4f6;
        }
      }

      .btn-primary {
        padding: 10px 20px;
        border: none;
        background: #059669;
        color: white;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background: #047857;
        }

        &:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
      }
    }

    @media (max-width: 768px) {
      .modal-overlay {
        padding: 10px;
      }

      .modal-content {
        max-height: 95vh;
      }

      .batch-stats .stats-grid {
        grid-template-columns: 1fr;
      }

      .shipments-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }

      .shipment-item .detail-row {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class BatchDetailModalComponent implements OnInit, OnDestroy {
  @Input() isVisible = false;
  @Input() batchId: string | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() batchCompleted = new EventEmitter<void>();

  batch: Batch | null = null;
  shipments: Shipment[] = [];
  filteredShipments: Shipment[] = [];
  statusFilter = '';
  chartData: PieChartData[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly driverService: DriverService) {}

  ngOnInit(): void {
    if (this.batchId) {
      this.loadBatchDetails();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBatchDetails(): void {
    if (!this.batchId) return;

    // Load batch info
    this.driverService.getBatchDetails(this.batchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          // API may return a wrapper object like { batch, shipments, stats }
          const payload: any = res;
          if (payload && payload.batch) {
            this.batch = payload.batch as Batch;
            if (Array.isArray(payload.shipments)) {
              this.shipments = payload.shipments as Shipment[];
              this.filteredShipments = this.shipments;
              this.updateChartData();
            }
          } else {
            // fallback if API returns Batch directly
            this.batch = res as unknown as Batch;
          }
        },
        error: (error) => {
          console.error('Error loading batch details:', error);
        }
      });

    // Load batch shipments
    this.driverService.getShipmentsForBatch(this.batchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shipments) => {
          this.shipments = shipments;
          this.filteredShipments = shipments;
          this.updateChartData();
        },
        error: (error) => {
          console.error('Error loading batch shipments:', error);
        }
      });
  }

  filterShipments(): void {
    if (!this.statusFilter) {
      this.filteredShipments = this.shipments;
    } else {
      this.filteredShipments = this.shipments.filter(s => String(s.status) === this.statusFilter);
    }
  }

  updateChartData(): void {
    const delivered = this.getDeliveredCount();
    const inTransit = this.getInTransitCount();
    const pending = this.getPendingCount();
    const returned = this.getReturnedCount();

    this.chartData = [
      {
        label: 'Livrés',
        value: delivered,
        color: '#059669',
        percentage: Math.round((delivered / this.shipments.length) * 100)
      },
      {
        label: 'En transit',
        value: inTransit,
        color: '#d97706',
        percentage: Math.round((inTransit / this.shipments.length) * 100)
      },
      {
        label: 'En attente',
        value: pending,
        color: '#2563eb',
        percentage: Math.round((pending / this.shipments.length) * 100)
      },
      {
        label: 'Retournés',
        value: returned,
        color: '#dc2626',
        percentage: Math.round((returned / this.shipments.length) * 100)
      }
    ].filter(item => item.value > 0);
  }

  getDeliveredCount(): number {
    return this.shipments.filter(s => String(s.status) === 'delivered').length;
  }

  getInTransitCount(): number {
    return this.shipments.filter(s =>
      ['in_transit', 'out_for_delivery'].includes(String(s.status))
    ).length;
  }

  getPendingCount(): number {
    return this.shipments.filter(s => String(s.status) === 'pending').length;
  }

  getReturnedCount(): number {
    return this.shipments.filter(s => String(s.status) === 'returned').length;
  }

  getTotalRevenue(): number {
    return this.shipments.reduce((sum, s) => sum + (s.amount || 0), 0);
  }

  getProgressPercentage(): number {
    if (this.shipments.length === 0) return 0;
    return Math.round((this.getDeliveredCount() / this.shipments.length) * 100);
  }

  getStatusLabel(status: any): string {
    const key = String(status || '');
    const labels: { [key: string]: string } = {
      'pending': 'En attente',
      'in_transit': 'En transit',
      'out_for_delivery': 'En livraison',
      'delivered': 'Livré',
      'returned': 'Retourné',
      'cancelled': 'Annulé'
    };
    return labels[key] || String(status) || 'Inconnu';
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('fr-FR');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND'
    }).format(amount);
  }

  canCompleteBatch(): boolean {
    return this.shipments.length > 0 &&
           this.shipments.every(s => String(s.status) === 'delivered' || String(s.status) === 'returned');
  }

  async markAsDelivered(shipmentId: string): Promise<void> {
    try {
      await this.driverService.updateShipmentStatus(shipmentId, 'delivered');
      this.loadBatchDetails(); // Reload to get updated data
    } catch (error) {
      console.error('Error marking shipment as delivered:', error);
    }
  }

  async markInTransit(shipmentId: string): Promise<void> {
    try {
      await this.driverService.updateShipmentStatus(shipmentId, 'in_transit');
      this.loadBatchDetails(); // Reload to get updated data
    } catch (error) {
      console.error('Error marking shipment as in transit:', error);
    }
  }

  async completeBatch(): Promise<void> {
    if (!this.batchId || !this.canCompleteBatch()) return;

    try {
      await this.driverService.completeBatchDelivery(this.batchId);
      this.batchCompleted.emit();
      this.close();
    } catch (error) {
      console.error('Error completing batch:', error);
    }
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closeModal.emit();
  }
}
