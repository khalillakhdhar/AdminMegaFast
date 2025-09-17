import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GeolocationService, GeolocationPosition } from '../../../core/services/geolocation.service';

@Component({
  selector: 'app-driver-routes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="driver-routes">
      <div class="page-header">
        <h1>
          <i class="fas fa-route"></i>
          Navigation GPS
        </h1>
        <p>Géolocalisation et navigation pour livreurs</p>
      </div>

      <!-- Current Location Status -->
      <div class="location-status-card">
        <div class="status-header">
          <h3>
            <i class="fas fa-map-marker-alt"></i>
            Position actuelle
          </h3>
          <button
            class="btn btn-primary btn-sm"
            (click)="refreshLocation()"
            [disabled]="isLoadingLocation">
            <i class="fas fa-refresh" [class.fa-spin]="isLoadingLocation"></i>
            Actualiser
          </button>
        </div>

        <div class="location-info" *ngIf="currentPosition">
          <div class="coordinates">
            <span class="label">Coordonnées:</span>
            <span class="value">{{ currentPosition.lat | number:'1.6-6' }}, {{ currentPosition.lng | number:'1.6-6' }}</span>
          </div>
          <div class="accuracy">
            <span class="label">Précision:</span>
            <span class="value">{{ currentPosition.accuracy | number:'1.0-0' }}m</span>
          </div>
        </div>

        <div class="location-error" *ngIf="locationError">
          <i class="fas fa-exclamation-triangle"></i>
          {{ locationError }}
        </div>
      </div>

      <!-- Quick Navigation -->
      <div class="navigation-section">
        <div class="section-header">
          <h3>
            <i class="fas fa-navigation"></i>
            Navigation rapide
          </h3>
        </div>

        <div class="navigation-card">
          <div class="nav-input">
            <label for="destination">Destination</label>
            <input
              type="text"
              id="destination"
              class="form-control"
              placeholder="Saisissez une adresse..."
              [(ngModel)]="destinationAddress"
              (keypress)="onDestinationKeyPress($event)">
          </div>

          <div class="nav-actions">
            <button
              class="btn btn-primary"
              (click)="openGoogleMaps()"
              [disabled]="!destinationAddress || !currentPosition">
              <i class="fas fa-external-link-alt"></i>
              Ouvrir dans Google Maps
            </button>
          </div>
        </div>

        <div class="quick-destinations">
          <h4>Destinations fréquentes</h4>
          <div class="destination-buttons">
            <button class="btn btn-outline" (click)="setQuickDestination('Centre de tri')">
              <i class="fas fa-warehouse"></i>
              Centre de tri
            </button>
            <button class="btn btn-outline" (click)="setQuickDestination('Bureau principal')">
              <i class="fas fa-building"></i>
              Bureau principal
            </button>
            <button class="btn btn-outline" (click)="setQuickDestination('Station-service')">
              <i class="fas fa-gas-pump"></i>
              Station-service
            </button>
          </div>
        </div>
      </div>

      <!-- Error Messages -->
      <div class="error-message" *ngIf="navigationError">
        <i class="fas fa-exclamation-circle"></i>
        {{ navigationError }}
        <button class="btn btn-close" (click)="navigationError = ''">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .driver-routes {
      .page-header {
        margin-bottom: 24px;
        padding: 24px;
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        border-radius: 16px;
        color: white;

        h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        p {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }
      }

      .location-status-card, .navigation-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .navigation-section {
        .section-header {
          margin-bottom: 16px;

          h3 {
            margin: 0;
            color: #1e293b;
            font-size: 20px;
            display: flex;
            align-items: center;
            gap: 8px;

            i {
              color: #8b5cf6;
            }
          }
        }

        .nav-input {
          margin-bottom: 16px;

          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #374151;
          }

          .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;

            &:focus {
              outline: none;
              border-color: #8b5cf6;
              box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
            }
          }
        }

        .nav-actions {
          margin-bottom: 24px;
        }

        .quick-destinations {
          h4 {
            margin: 0 0 12px 0;
            color: #374151;
            font-size: 16px;
            font-weight: 600;
          }

          .destination-buttons {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;

            .btn-outline {
              padding: 8px 16px;
              border: 1px solid #d1d5db;
              background: white;
              color: #374151;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 8px;

              &:hover {
                border-color: #8b5cf6;
                background: #f8fafc;
              }
            }
          }
        }
      }

      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h3 {
          margin: 0;
          color: #1e293b;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 8px;

          i {
            color: #ef4444;
          }
        }
      }

      .location-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }

        .coordinates, .accuracy {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .label {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
            text-transform: uppercase;
          }

          .value {
            font-size: 14px;
            color: #1e293b;
            font-weight: 600;
          }
        }
      }

      .location-error, .error-message {
        background: #fef2f2;
        color: #dc2626;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #fecaca;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .btn-close {
          background: none;
          border: none;
          color: #dc2626;
          cursor: pointer;
          padding: 4px;
        }
      }

      .error-message {
        margin-top: 16px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        &.btn-primary {
          background: #8b5cf6;
          color: white;

          &:hover:not(:disabled) {
            background: #7c3aed;
          }
        }

        &.btn-sm {
          padding: 8px 16px;
          font-size: 14px;
        }
      }
    }
  `]
})
export class DriverRoutesComponent implements OnInit, OnDestroy {
  currentPosition: GeolocationPosition | null = null;

  isLoadingLocation = false;
  locationError = '';
  navigationError = '';

  destinationAddress = '';

  private destroy$ = new Subject<void>();

  constructor(
    private readonly geolocationService: GeolocationService
  ) {}

  ngOnInit(): void {
    this.initializeLocation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeLocation(): void {
    // Subscribe to current position from geolocation service
    this.geolocationService.currentPosition
      .pipe(takeUntil(this.destroy$))
      .subscribe(position => {
        this.currentPosition = position;
      });

    // Subscribe to geolocation errors
    this.geolocationService.error
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.locationError = error?.message || '';
      });

    // Try to get current position on init
    this.refreshLocation();
  }

  refreshLocation(): void {
    this.isLoadingLocation = true;
    this.locationError = '';

    this.geolocationService.getCurrentPosition()
      .then(() => {
        this.isLoadingLocation = false;
      })
      .catch(() => {
        this.isLoadingLocation = false;
      });
  }

  onDestinationKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.openGoogleMaps();
    }
  }

  openGoogleMaps(): void {
    if (!this.destinationAddress.trim()) {
      this.navigationError = 'Veuillez saisir une destination';
      return;
    }

    if (!this.currentPosition) {
      this.navigationError = 'Position actuelle non disponible';
      return;
    }

    try {
      const origin = `${this.currentPosition.lat},${this.currentPosition.lng}`;
      const destination = encodeURIComponent(this.destinationAddress.trim());
      const googleMapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;

      window.open(googleMapsUrl, '_blank');
      this.navigationError = '';
    } catch (error) {
      this.navigationError = 'Erreur lors de l\'ouverture de Google Maps';
    }
  }

  setQuickDestination(destination: string): void {
    this.destinationAddress = destination;
    this.openGoogleMaps();
  }
}
