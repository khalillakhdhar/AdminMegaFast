import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Services de géolocalisation
import { GoogleMapsService } from '../../core/services/google-maps.service';
import { GeolocationService } from '../../core/services/geolocation.service';
import { LocationTrackingService } from '../../core/services/location-tracking.service';
import { RouteCalculationService } from '../../core/services/route-calculation.service';

// Composants
import { RealTimeMapComponent } from '../../shared/components/real-time-map.component';
import { DeliveryMapComponent } from '../../shared/components/delivery-map.component';

@Component({
  selector: 'app-geolocation-demo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RealTimeMapComponent,
    DeliveryMapComponent
  ],
  template: `
    <div class="geolocation-demo">
      <!-- En-tête de démonstration -->
      <div class="demo-header">
        <div class="container">
          <h1>
            <i class="fas fa-map-marked-alt"></i>
            Démo Géolocalisation MegaFast
          </h1>
          <p class="lead">
            Système de géolocalisation temps réel avec Google Maps API
          </p>

          <!-- Status des services -->
          <div class="services-status">
            <div class="service-item" [class.ready]="googleMapsReady">
              <i class="fas" [class.fa-check-circle]="googleMapsReady" [class.fa-clock]="!googleMapsReady"></i>
              Google Maps API
            </div>
            <div class="service-item" [class.ready]="geolocationReady">
              <i class="fas" [class.fa-check-circle]="geolocationReady" [class.fa-clock]="!geolocationReady"></i>
              Géolocalisation
            </div>
            <div class="service-item" [class.ready]="trackingReady">
              <i class="fas" [class.fa-check-circle]="trackingReady" [class.fa-clock]="!trackingReady"></i>
              Suivi en temps réel
            </div>
            <div class="service-item" [class.ready]="routingReady">
              <i class="fas" [class.fa-check-circle]="routingReady" [class.fa-clock]="!routingReady"></i>
              Calcul d'itinéraires
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation des vues -->
      <div class="view-selector">
        <div class="container">
          <div class="btn-group" role="group">
            <button type="button"
                    class="btn"
                    [class.btn-primary]="currentView === 'admin'"
                    [class.btn-outline-primary]="currentView !== 'admin'"
                    (click)="setView('admin')">
              <i class="fas fa-desktop"></i>
              Vue Administrateur
            </button>
            <button type="button"
                    class="btn"
                    [class.btn-primary]="currentView === 'driver'"
                    [class.btn-outline-primary]="currentView !== 'driver'"
                    (click)="setView('driver')">
              <i class="fas fa-mobile-alt"></i>
              Vue Chauffeur Mobile
            </button>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="demo-content">
        <!-- Vue Administrateur -->
        <div *ngIf="currentView === 'admin'" class="admin-view">
          <div class="container-fluid">
            <div class="row">
              <div class="col-12">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">
                      <i class="fas fa-map"></i>
                      Suivi en Temps Réel - Tableau de Bord Admin
                    </h5>
                  </div>
                  <div class="card-body p-0">
                    <app-real-time-map
                      [height]="600">
                    </app-real-time-map>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Vue Chauffeur Mobile -->
        <div *ngIf="currentView === 'driver'" class="driver-view">
          <div class="mobile-frame">
            <div class="mobile-header">
              <span class="time">14:30</span>
              <div class="status-indicators">
                <i class="fas fa-signal"></i>
                <i class="fas fa-wifi"></i>
                <i class="fas fa-battery-three-quarters"></i>
              </div>
            </div>

            <div class="mobile-content">
              <app-delivery-map
                driverId="demo-driver-123"
                [isOfflineMode]="false">
              </app-delivery-map>
            </div>
          </div>
        </div>
      </div>

      <!-- Informations techniques -->
      <div class="technical-info" *ngIf="showTechnicalInfo">
        <div class="container">
          <div class="row">
            <div class="col-md-6">
              <div class="card">
                <div class="card-header">
                  <h6 class="card-title mb-0">
                    <i class="fas fa-cogs"></i>
                    Services Intégrés
                  </h6>
                </div>
                <div class="card-body">
                  <ul class="list-unstyled">
                    <li><strong>GoogleMapsService:</strong> Intégration Google Maps JavaScript API</li>
                    <li><strong>GeolocationService:</strong> HTML5 Geolocation avec haute précision</li>
                    <li><strong>LocationTrackingService:</strong> Suivi temps réel via Firebase</li>
                    <li><strong>RouteCalculationService:</strong> Optimisation d'itinéraires multi-points</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="card">
                <div class="card-header">
                  <h6 class="card-title mb-0">
                    <i class="fas fa-mobile-alt"></i>
                    Fonctionnalités Mobile
                  </h6>
                </div>
                <div class="card-body">
                  <ul class="list-unstyled">
                    <li><strong>PWA Ready:</strong> Progressive Web App</li>
                    <li><strong>Offline Mode:</strong> Fonctionnement hors ligne</li>
                    <li><strong>Voice Guidance:</strong> Guidage vocal intégré</li>
                    <li><strong>Touch Optimized:</strong> Interface tactile optimisée</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="demo-footer">
        <div class="container">
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              MegaFast Delivery - Système de Géolocalisation v1.0
            </small>
            <button class="btn btn-sm btn-outline-secondary" (click)="toggleTechnicalInfo()">
              <i class="fas fa-info-circle"></i>
              {{ showTechnicalInfo ? 'Masquer' : 'Afficher' }} les détails techniques
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./geolocation-demo.component.scss']
})
export class GeolocationDemoComponent {
  currentView: 'admin' | 'driver' = 'admin';
  showTechnicalInfo = false;

  // Status des services
  googleMapsReady = false;
  geolocationReady = false;
  trackingReady = false;
  routingReady = false;

  constructor(
    private googleMapsService: GoogleMapsService,
    private geolocationService: GeolocationService,
    private locationTrackingService: LocationTrackingService,
    private routeCalculationService: RouteCalculationService
  ) {
    this.checkServicesStatus();
  }

  private async checkServicesStatus(): Promise<void> {
    try {
      // Vérifier Google Maps
      await this.googleMapsService.loadGoogleMaps();
      this.googleMapsReady = true;
    } catch (error) {
      console.warn('Google Maps non disponible:', error);
    }

    try {
      // Vérifier la géolocalisation
      await this.geolocationService.getCurrentPosition();
      this.geolocationReady = true;
    } catch (error) {
      console.warn('Géolocalisation non disponible:', error);
    }

    // Les autres services sont considérés comme prêts s'ils sont injectés
    this.trackingReady = true;
    this.routingReady = true;
  }

  setView(view: 'admin' | 'driver'): void {
    this.currentView = view;
  }

  toggleTechnicalInfo(): void {
    this.showTechnicalInfo = !this.showTechnicalInfo;
  }
}
