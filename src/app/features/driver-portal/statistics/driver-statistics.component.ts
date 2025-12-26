import { CommonModule } from "@angular/common";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import {
  DriverPortalService,
  DriverStats,
} from "../../../core/services/driver-portal.service";

@Component({
  selector: "app-driver-statistics",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="driver-statistics">
      <div class="page-header">
        <h1>Mes Statistiques</h1>
        <p>Suivez vos performances et votre progression</p>
      </div>

      <div class="stats-grid" *ngIf="stats">
        <div class="stat-card performance">
          <h3>Performance générale</h3>
          <div class="stat-item">
            <span class="label">Taux de livraison</span>
            <span class="value">{{ stats.deliveryRate }}%</span>
          </div>
          <div class="stat-item">
            <span class="label">Total colis</span>
            <span class="value">{{ stats.totalShipments }}</span>
          </div>
        </div>

        <div class="stat-card revenue">
          <h3>Revenus</h3>
          <div class="stat-item">
            <span class="label">Total revenus</span>
            <span class="value">{{ formatCurrency(stats.totalRevenue) }}</span>
          </div>
        </div>

        <div class="stat-card deliveries">
          <h3>Livraisons</h3>
          <div class="stat-item">
            <span class="label">Livrés</span>
            <span class="value">{{ stats.deliveredShipments }}</span>
          </div>
          <div class="stat-item">
            <span class="label">En transit</span>
            <span class="value">{{ stats.inTransitShipments }}</span>
          </div>
          <div class="stat-item">
            <span class="label">Retournés</span>
            <span class="value">{{ stats.returnedShipments }}</span>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="!stats">
        <div class="spinner"></div>
        <p>Chargement des statistiques...</p>
      </div>
    </div>
  `,
  styles: [
    `
      .driver-statistics {
        .page-header {
          margin-bottom: 32px;
          padding: 24px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 16px;
          color: white;

          h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 8px 0;
          }

          p {
            font-size: 16px;
            opacity: 0.9;
            margin: 0;
          }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;

          .stat-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #e2e8f0;

            h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1e293b;
              margin: 0 0 20px 0;
            }

            .stat-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #f1f5f9;

              &:last-child {
                border-bottom: none;
              }

              .label {
                font-size: 14px;
                color: #64748b;
              }

              .value {
                font-size: 18px;
                font-weight: 700;
                color: #1e293b;
              }
            }
          }
        }

        .loading {
          text-align: center;
          padding: 60px;
          color: #64748b;

          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class DriverStatisticsComponent implements OnInit, OnDestroy {
  stats: DriverStats | null = null;
  private destroy$ = new Subject<void>();

  constructor(private readonly driverService: DriverPortalService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.driverService
      .getDriverStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error("Erreur lors du chargement des statistiques:", error);
        },
      });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  }
}
