import { CommonModule } from "@angular/common";
import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Shipment } from "../../../core/models/shipment.model";
import { DriverPortalService } from "../../../core/services/driver-portal.service";

@Component({
  selector: "app-shipment-detail-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="closeModal()">
      <div
        class="modal-content"
        (click)="$event.stopPropagation()"
        *ngIf="shipment"
      >
        <div class="modal-header">
          <h2>Détails du Colis</h2>
          <button class="close-btn" (click)="closeModal()" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <!-- Shipment Header -->
          <div class="shipment-header">
            <div class="barcode-section">
              <h3>{{ shipment.barcode }}</h3>
              <span class="status-badge" [class]="shipment.status">
                {{ getStatusLabel(shipment.status) }}
              </span>
            </div>
          </div>

          <!-- Client Information -->
          <div class="info-section">
            <h4><i class="fas fa-user"></i> Informations Client</h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Nom:</label>
                <span>{{ shipment.clientName || "N/A" }}</span>
              </div>
              <div class="info-item">
                <label>Téléphone:</label>
                <span>{{ shipment.clientPhone || "N/A" }}</span>
              </div>
              <div class="info-item" *ngIf="shipment.clientId">
                <label>ID Client:</label>
                <span>{{ shipment.clientId }}</span>
              </div>
            </div>
          </div>

          <!-- Address Information -->
          <div class="info-section">
            <h4><i class="fas fa-map-marker-alt"></i> Adresses</h4>

            <!-- Destination Address -->
            <div class="address-block destination">
              <h5><i class="fas fa-location-arrow"></i> Destination</h5>
              <div class="address-content">
                <p class="address">
                  {{ shipment.address || "Adresse non spécifiée" }}
                </p>
                <div class="location-details">
                  <span class="city" *ngIf="shipment.city">{{
                    shipment.city
                  }}</span>
                  <span class="delegation" *ngIf="shipment.delegation"
                    >({{ shipment.delegation }})</span
                  >
                </div>
                <div class="coordinates" *ngIf="shipment.geo">
                  <i class="fas fa-crosshairs"></i>
                  <span>{{ shipment.geo.lat }}, {{ shipment.geo.lng }}</span>
                  <button
                    class="map-link"
                    (click)="openInMaps(shipment.geo!)"
                    type="button"
                  >
                    <i class="fas fa-external-link-alt"></i>
                    Ouvrir dans Maps
                  </button>
                </div>
              </div>
            </div>

            <!-- Pickup Address -->
            <div class="address-block pickup" *ngIf="shipment.pickupAddress">
              <h5><i class="fas fa-truck-loading"></i> Point de collecte</h5>
              <div class="address-content">
                <p class="address">{{ shipment.pickupAddress }}</p>
                <div class="location-details">
                  <span class="city" *ngIf="shipment.pickupCity">{{
                    shipment.pickupCity
                  }}</span>
                  <span class="delegation" *ngIf="shipment.pickupDelegation"
                    >({{ shipment.pickupDelegation }})</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Package Details -->
          <div class="info-section">
            <h4><i class="fas fa-box"></i> Détails du Colis</h4>
            <div class="info-grid">
              <div class="info-item" *ngIf="shipment.weight">
                <label>Poids:</label>
                <span>{{ shipment.weight }} kg</span>
              </div>
              <div class="info-item" *ngIf="shipment.volume">
                <label>Volume:</label>
                <span>{{ shipment.volume }} m³</span>
              </div>
              <div class="info-item" *ngIf="shipment.amount">
                <label>Montant COD:</label>
                <span class="amount">{{
                  formatCurrency(shipment.amount)
                }}</span>
              </div>
              <div class="info-item" *ngIf="shipment.paymentMode">
                <label>Mode de paiement:</label>
                <span>{{ getPaymentModeLabel(shipment.paymentMode) }}</span>
              </div>
            </div>
          </div>

          <!-- Assignment Details -->
          <div class="info-section" *ngIf="shipment.assignedTo">
            <h4><i class="fas fa-tasks"></i> Affectation</h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Assigné à:</label>
                <span>{{ shipment.assignedTo }}</span>
              </div>
            </div>
          </div>

          <!-- Products and Metadata -->
          <div
            class="info-section"
            *ngIf="getShipmentMeta(shipment)?.items?.length"
          >
            <h4><i class="fas fa-box"></i> Produits</h4>
            <div class="products-table">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th class="text-center">Qté</th>
                    <th class="text-end">Prix Unit.</th>
                    <th class="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of getShipmentMeta(shipment)?.items">
                    <td>{{ item.description }}</td>
                    <td class="text-center">{{ item.qty || item.quantity }}</td>
                    <td class="text-end">
                      {{ formatCurrency(item.unitPrice || 0) }}
                    </td>
                    <td class="text-end">
                      {{
                        formatCurrency(
                          (item.qty || item.quantity) * (item.unitPrice || 0)
                        )
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Fees and Totals -->
          <div class="info-section" *ngIf="getShipmentMeta(shipment)?.fees">
            <h4><i class="fas fa-calculator"></i> Frais et Totaux</h4>
            <div class="fees-grid">
              <div class="fee-item" *ngIf="getShipmentMeta(shipment)?.subtotal">
                <label>Sous-total produits:</label>
                <span>{{
                  formatCurrency(getShipmentMeta(shipment)?.subtotal)
                }}</span>
              </div>
              <div
                class="fee-item"
                *ngIf="getShipmentMeta(shipment)?.fees?.feeTotal"
              >
                <label>Frais de livraison:</label>
                <span>{{
                  formatCurrency(getShipmentMeta(shipment)?.fees?.feeTotal)
                }}</span>
              </div>
              <div
                class="fee-item"
                *ngIf="getShipmentMeta(shipment)?.grandTotal"
                class="total-row"
              >
                <label><strong>Total général:</strong></label>
                <span
                  ><strong>{{
                    formatCurrency(getShipmentMeta(shipment)?.grandTotal)
                  }}</strong></span
                >
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="info-section" *ngIf="shipment.notes">
            <h4><i class="fas fa-sticky-note"></i> Notes</h4>
            <div class="notes-content">
              <p>{{ shipment.notes }}</p>
            </div>
          </div>

          <!-- Timestamps -->
          <div class="info-section">
            <h4><i class="fas fa-clock"></i> Historique</h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Créé le:</label>
                <span>{{ formatDateTime(shipment.createdAt) }}</span>
              </div>
              <div class="info-item" *ngIf="shipment.updatedAt">
                <label>Modifié le:</label>
                <span>{{ formatDateTime(shipment.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- History -->
          <div
            class="info-section"
            *ngIf="shipment.history && shipment.history.length > 0"
          >
            <h4><i class="fas fa-history"></i> Historique des statuts</h4>
            <div class="history-timeline">
              <div class="history-item" *ngFor="let entry of shipment.history">
                <div class="history-icon">
                  <i class="fas" [class]="getStatusIcon(entry.status)"></i>
                </div>
                <div class="history-content">
                  <div class="history-status">
                    {{ getStatusLabel(entry.status) }}
                  </div>
                  <div class="history-time">{{ formatDateTime(entry.at) }}</div>
                  <div class="history-note" *ngIf="entry.note">
                    {{ entry.note }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            (click)="closeModal()"
            type="button"
          >
            Fermer
          </button>
          <button
            class="btn btn-primary"
            (click)="openTrackingView()"
            type="button"
          >
            <i class="fas fa-route"></i>
            Voir sur la carte
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }

      .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border-radius: 12px 12px 0 0;

        h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background 0.2s;

          &:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        }
      }

      .modal-body {
        padding: 1.5rem;
      }

      .shipment-header {
        margin-bottom: 2rem;

        .barcode-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;

          h3 {
            margin: 0;
            font-family: "Courier New", monospace;
            color: #1f2937;
          }

          .status-badge {
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;

            &.created {
              background: #f3f4f6;
              color: #374151;
            }
            &.assigned {
              background: #fef3c7;
              color: #92400e;
            }
            &.in_transit {
              background: #dbeafe;
              color: #1e40af;
            }
            &.delivered {
              background: #d1fae5;
              color: #065f46;
            }
            &.returned {
              background: #fee2e2;
              color: #991b1b;
            }
            &.canceled {
              background: #f3f4f6;
              color: #6b7280;
            }
          }
        }
      }

      .info-section {
        margin-bottom: 2rem;

        h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 1rem 0;
          color: #1f2937;
          font-size: 1.1rem;
          font-weight: 600;

          i {
            color: #3b82f6;
          }
        }

        h5 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.5rem 0;
          color: #6b7280;
          font-size: 1rem;
          font-weight: 500;

          i {
            color: #3b82f6;
          }
        }
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 6px;

          label {
            font-weight: 500;
            color: #6b7280;
          }

          span {
            color: #1f2937;
            font-weight: 500;

            &.amount {
              color: #059669;
              font-weight: 600;
            }

            &.batch-id {
              background: #eff6ff;
              color: #1d4ed8;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.875rem;
            }
          }
        }
      }

      .address-block {
        margin-bottom: 1.5rem;
        padding: 1rem;
        border-radius: 8px;

        &.destination {
          background: #f0f9ff;
          border-left: 4px solid #0ea5e9;
        }

        &.pickup {
          background: #fefce8;
          border-left: 4px solid #eab308;
        }

        .address-content {
          .address {
            font-weight: 500;
            color: #1f2937;
            margin: 0.5rem 0;
          }

          .location-details {
            display: flex;
            gap: 0.5rem;
            color: #6b7280;
            font-size: 0.875rem;
          }

          .coordinates {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-top: 0.5rem;
            font-family: "Courier New", monospace;
            font-size: 0.875rem;
            color: #059669;

            .map-link {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.75rem;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 0.25rem;
              margin-left: auto;

              &:hover {
                background: #2563eb;
              }
            }
          }
        }
      }

      .notes-content {
        padding: 1rem;
        background: #f9fafb;
        border-radius: 6px;
        border-left: 4px solid #6b7280;

        p {
          margin: 0;
          line-height: 1.5;
          color: #374151;
        }
      }

      .products-table {
        background: #f8fafc;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 1rem;

        table {
          width: 100%;
          margin: 0;
          background: white;
          border-collapse: collapse;

          th,
          td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
          }

          th {
            background: #f3f4f6;
            font-weight: 600;
            color: #374151;
          }

          .text-center {
            text-align: center;
          }

          .text-end {
            text-align: right;
          }
        }
      }

      .fees-grid {
        display: grid;
        gap: 1rem;
        margin-top: 1rem;

        .fee-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 6px;

          &.total-row {
            background: #e0f2fe;
            border: 1px solid #0ea5e9;
          }

          label {
            color: #374151;
            margin: 0;
          }

          span {
            font-weight: 500;
            color: #111827;
          }
        }
      }

      .history-timeline {
        .history-item {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;

          .history-icon {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            background: #3b82f6;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .history-content {
            flex: 1;

            .history-status {
              font-weight: 600;
              color: #1f2937;
            }

            .history-time {
              font-size: 0.875rem;
              color: #6b7280;
              margin: 0.25rem 0;
            }

            .history-note {
              font-size: 0.875rem;
              color: #374151;
              font-style: italic;
            }
          }
        }
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding: 1.5rem;
        border-top: 1px solid #e5e7eb;

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;

          &.btn-secondary {
            background: #f3f4f6;
            color: #374151;

            &:hover {
              background: #e5e7eb;
            }
          }

          &.btn-primary {
            background: #3b82f6;
            color: white;

            &:hover {
              background: #2563eb;
            }
          }
        }
      }

      @media (max-width: 768px) {
        .modal-content {
          margin: 1rem;
          max-height: calc(100vh - 2rem);
        }

        .info-grid {
          grid-template-columns: 1fr;
        }

        .modal-footer {
          flex-direction: column;

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      }
    `,
  ],
})
export class ShipmentDetailModalComponent {
  @Input() shipment: Shipment | null = null;
  @Input() isVisible = false;
  @Output() closeEvent = new EventEmitter<void>();

  constructor(private readonly driverService: DriverPortalService) {}

  closeModal(): void {
    this.closeEvent.emit();
  }

  openInMaps(coordinates: { lat: number; lng: number }): void {
    const url = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
    window.open(url, "_blank");
  }

  openTrackingView(): void {
    // This could open a more advanced tracking view
    if (this.shipment?.geo) {
      this.openInMaps(this.shipment.geo);
    }
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      created: "Créé",
      assigned: "Assigné",
      in_transit: "En transit",
      delivered: "Livré",
      returned: "Retourné",
      canceled: "Annulé",
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      created: "fa-plus-circle",
      assigned: "fa-user-check",
      in_transit: "fa-truck",
      delivered: "fa-check-circle",
      returned: "fa-undo",
      canceled: "fa-times-circle",
    };
    return icons[status] || "fa-circle";
  }

  getShipmentMeta(shipment: Shipment): any {
    // Try to extract metadata from notes field with META: prefix
    if (shipment.notes && shipment.notes.includes("META:")) {
      try {
        const metaStart = shipment.notes.indexOf("META:") + 5;
        const metaString = shipment.notes.substring(metaStart);
        return JSON.parse(metaString);
      } catch (e) {
        console.warn("Failed to parse shipment metadata:", e);
      }
    }

    // Return empty meta structure
    return {
      items: [],
      fees: null,
      subtotal: 0,
      grandTotal: shipment.amount || 0,
    };
  }

  getPaymentModeLabel(mode: string): string {
    const labels: { [key: string]: string } = {
      cod: "Contre remboursement",
      invoice: "Facture",
    };
    return labels[mode] || mode;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency: "TND",
    }).format(amount);
  }

  formatDateTime(date: any): string {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    return (
      d.toLocaleDateString("fr-FR") +
      " à " +
      d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }
}
