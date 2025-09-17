import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealTimeMapComponent } from '../../shared/components/real-time-map.component';

@Component({
  selector: 'app-real-time-tracking',
  standalone: true,
  imports: [CommonModule, RealTimeMapComponent],
  template: `
    <div class="container-fluid">
      <!-- Header de la page -->
      <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800">
          <i class="fas fa-map-marked-alt text-primary"></i>
          Tracking Temps Réel
        </h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="#" routerLink="/dashboard">Dashboard</a></li>
            <li class="breadcrumb-item active" aria-current="page">Tracking</li>
          </ol>
        </nav>
      </div>

      <!-- Alertes et notifications -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="alert alert-info" role="alert">
            <i class="fas fa-info-circle me-2"></i>
            Le tracking des drivers se met à jour automatiquement toutes les 5 secondes.
          </div>
        </div>
      </div>

      <!-- Statistiques rapides -->
      <div class="row mb-4">
        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-left-success shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Drivers En Ligne
                  </div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800" id="drivers-online">12</div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-users fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Drivers Occupés
                  </div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800" id="drivers-busy">8</div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-truck fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-left-info shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Livraisons Actives
                  </div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">24</div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-clipboard-list fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div class="card border-left-primary shadow h-100 py-2">
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Zone de Couverture
                  </div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">Tunis</div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-map fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Composant de carte temps réel -->
      <div class="row">
        <div class="col-12">
          <app-real-time-map
            height="600px"
            [autoRefresh]="true"
            [refreshInterval]="5000">
          </app-real-time-map>
        </div>
      </div>

      <!-- Actions supplémentaires -->
      <div class="row mt-4">
        <div class="col-md-6">
          <div class="card shadow">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">Actions Rapides</h6>
            </div>
            <div class="card-body">
              <div class="list-group list-group-flush">
                <a href="#" class="list-group-item list-group-item-action">
                  <i class="fas fa-plus text-success me-2"></i>
                  Nouveau Driver
                </a>
                <a href="#" class="list-group-item list-group-item-action">
                  <i class="fas fa-route text-info me-2"></i>
                  Optimiser les Routes
                </a>
                <a href="#" class="list-group-item list-group-item-action">
                  <i class="fas fa-bell text-warning me-2"></i>
                  Notifications Push
                </a>
                <a href="#" class="list-group-item list-group-item-action">
                  <i class="fas fa-chart-line text-primary me-2"></i>
                  Rapports de Performance
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card shadow">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">Alertes Récentes</h6>
            </div>
            <div class="card-body">
              <div class="list-group list-group-flush">
                <div class="list-group-item">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1 text-warning">Driver retardé</h6>
                    <small>3 min</small>
                  </div>
                  <p class="mb-1">Driver #D123 en retard sur livraison L456</p>
                </div>
                <div class="list-group-item">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1 text-success">Livraison terminée</h6>
                    <small>5 min</small>
                  </div>
                  <p class="mb-1">Driver #D098 a terminé la livraison L789</p>
                </div>
                <div class="list-group-item">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1 text-info">Nouveau driver en ligne</h6>
                    <small>8 min</small>
                  </div>
                  <p class="mb-1">Driver #D234 vient de se connecter</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .border-left-success { border-left: 0.25rem solid #1cc88a !important; }
    .border-left-warning { border-left: 0.25rem solid #f6c23e !important; }
    .border-left-info { border-left: 0.25rem solid #36b9cc !important; }
    .border-left-primary { border-left: 0.25rem solid #4e73df !important; }

    .me-2 { margin-right: 0.5rem; }

    .alert-info {
      background-color: #d1ecf1;
      border-color: #bee5eb;
      color: #0c5460;
    }
  `]
})
export class RealTimeTrackingComponent {
  constructor() {}
}
