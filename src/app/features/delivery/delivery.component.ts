import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

// Services
import { LocationTrackingService } from '../../core/services/location-tracking.service';
import { AuthenticationService } from '../../core/services/auth.service';

// Components
import { DeliveryMapComponent } from '../../shared/components/delivery-map.component';

// Models
import { Driver, Delivery } from '../../core/models/driver.model';

@Component({
  selector: 'app-delivery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DeliveryMapComponent
  ],
  template: `
    <div class="delivery-page">
      <!-- En-tête de la page -->
      <div class="page-header" [class.minimized]="isInDeliveryMode">
        <div class="driver-info">

          <div class="info">
            <h5>{{ currentDriver?.displayName || 'Chauffeur' }}</h5>
            <span class="status-badge" [class]="'status-' + driverStatus">
              <i class="fas fa-circle"></i>
              {{ getStatusLabel(driverStatus) }}
            </span>
          </div>
        </div>

        <div class="quick-stats" *ngIf="!isInDeliveryMode">
          <div class="stat-item">
            <span class="value">{{ totalDeliveries }}</span>
            <span class="label">Livraisons</span>
          </div>
          <div class="stat-item">
            <span class="value">{{ completedDeliveries }}</span>
            <span class="label">Terminées</span>
          </div>
          <div class="stat-item">
            <span class="value">{{ pendingDeliveries }}</span>
            <span class="label">En attente</span>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn btn-sm btn-outline-secondary" (click)="toggleOfflineMode()">
            <i class="fas" [class.fa-wifi]="!isOfflineMode" [class.fa-wifi-slash]="isOfflineMode"></i>
            {{ isOfflineMode ? 'Hors ligne' : 'En ligne' }}
          </button>

          <button class="btn btn-sm btn-outline-primary" (click)="openSettings()">
            <i class="fas fa-cog"></i>
          </button>
        </div>
      </div>

      <!-- Alertes système -->
      <div class="system-alerts" *ngIf="systemAlerts.length > 0">
        <div *ngFor="let alert of systemAlerts"
             class="alert"
             [class]="'alert-' + alert.type"
             [class.dismissible]="alert.dismissible">
          <i class="fas" [class]="getAlertIcon(alert.type)"></i>
          <span>{{ alert.message }}</span>
          <button *ngIf="alert.dismissible"
                  class="btn-close"
                  (click)="dismissAlert(alert.id)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Composant principal de livraison -->
      <div class="map-container">
        <app-delivery-map
          [driverId]="currentDriver?.id || ''"
          [isOfflineMode]="isOfflineMode"
          (statusChanged)="onDriverStatusChanged($event)"
          (deliveryCompleted)="onDeliveryCompleted($event)"
          (deliveryFailed)="onDeliveryFailed($event)"
          (errorOccurred)="onErrorOccurred($event)">
        </app-delivery-map>
      </div>

      <!-- Modal de confirmation de fin de journée -->
      <div class="modal fade"
           id="endWorkdayModal"
           tabindex="-1"
           *ngIf="showEndWorkdayModal">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="fas fa-clock"></i>
                Fin de journée
              </h5>
            </div>
            <div class="modal-body">
              <p>Voulez-vous terminer votre journée de travail ?</p>

              <div class="workday-summary">
                <h6>Résumé de la journée :</h6>
                <ul class="list-unstyled">
                  <li><strong>{{ completedDeliveries }}</strong> livraisons terminées</li>
                  <li><strong>{{ failedDeliveries }}</strong> livraisons échouées</li>
                  <li><strong>{{ totalDistance.toFixed(1) }} km</strong> parcourus</li>
                  <li><strong>{{ formatDuration(totalWorkTime) }}</strong> de travail</li>
                </ul>
              </div>

              <div class="form-group">
                <label for="endWorkdayNotes">Notes de fin de journée (optionnel) :</label>
                <textarea id="endWorkdayNotes"
                         class="form-control"
                         rows="3"
                         [(ngModel)]="endWorkdayNotes"
                         placeholder="Commentaires, problèmes rencontrés, suggestions..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button"
                      class="btn btn-secondary"
                      (click)="cancelEndWorkday()">
                Annuler
              </button>
              <button type="button"
                      class="btn btn-primary"
                      (click)="confirmEndWorkday()">
                <i class="fas fa-check"></i>
                Terminer la journée
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Overlay de chargement -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
        <p class="mt-2">{{ loadingMessage }}</p>
      </div>
    </div>
  `,
  styleUrls: ['./delivery.component.scss']
})
export class DeliveryComponent implements OnInit, OnDestroy {
  private titleService = inject(Title);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private locationService = inject(LocationTrackingService);
  private authService = inject(AuthenticationService);

  // État du composant
  currentDriver: Driver | null = null;
  driverStatus: 'available' | 'busy' | 'offline' = 'offline';
  isInDeliveryMode = false;
  isOfflineMode = false;
  isLoading = true;
  loadingMessage = 'Initialisation...';

  // Statistiques
  totalDeliveries = 0;
  completedDeliveries = 0;
  pendingDeliveries = 0;
  failedDeliveries = 0;
  totalDistance = 0;
  totalWorkTime = 0;

  // Alertes système
  systemAlerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    dismissible: boolean;
  }> = [];

  // Modal de fin de journée
  showEndWorkdayModal = false;
  endWorkdayNotes = '';

  // Subscriptions
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.titleService.setTitle('Livraisons - MegaFast Delivery');
    this.initializeDeliveryPage();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopLocationTracking();
  }

  private async initializeDeliveryPage(): Promise<void> {
    try {
      this.loadingMessage = 'Authentification...';

      // Vérifier l'authentification
      const user = this.authService.currentUser();
      if (!user) {
        this.router.navigate(['/auth/login']);
        return;
      }      this.loadingMessage = 'Chargement du profil chauffeur...';

      // Charger le profil du chauffeur
      await this.loadDriverProfile(user.uid);

      this.loadingMessage = 'Initialisation de la géolocalisation...';

      // Démarrer le suivi de localisation
      await this.startLocationTracking();

      this.loadingMessage = 'Chargement des livraisons...';

      // Charger les statistiques
      await this.loadDeliveryStats();

      // Vérifier s'il y a des livraisons en cours
      await this.checkActiveDeliveries();

      this.isLoading = false;

      // Afficher une alerte de bienvenue
      this.addSystemAlert('success', 'Bienvenue ! Vous êtes maintenant en ligne.', true);

    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      this.addSystemAlert('error', 'Erreur lors de l\'initialisation. Veuillez recharger la page.', false);
      this.isLoading = false;
    }
  }

  private async loadDriverProfile(userId: string): Promise<void> {
    try {
      // Simuler le chargement du profil - à remplacer par un vrai service
      this.currentDriver = {
        id: userId,
        name: 'Jean Dupont',
        displayName: 'Jean Dupont', // À charger depuis la base de données
        email: 'jean.dupont@megafast.com',
        phone: '+33 6 12 34 56 78',
        vehicle: {
          type: 'car',
          model: 'Peugeot Partner',
          licensePlate: 'AB-123-CD',
          maxCapacity: 500
        },
        status: 'available',
        active: true,
        workingHours: {
          monday: { start: '08:00', end: '18:00', active: true },
          tuesday: { start: '08:00', end: '18:00', active: true },
          wednesday: { start: '08:00', end: '18:00', active: true },
          thursday: { start: '08:00', end: '18:00', active: true },
          friday: { start: '08:00', end: '18:00', active: true },
          saturday: { start: '08:00', end: '18:00', active: true },
          sunday: { start: '08:00', end: '18:00', active: false }
        },
        stats: {
          totalDeliveries: 0,
          totalDistance: 0,
          totalTime: 0,
          averageDeliveryTime: 0,
          successRate: 0,
          lastMonthStats: {
            deliveries: 0,
            distance: 0,
            earnings: 0
          },
          ratings: {
            average: 0,
            totalRatings: 0,
            breakdown: {}
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      throw new Error('Impossible de charger le profil chauffeur');
    }
  }

  private async startLocationTracking(): Promise<void> {
    if (!this.currentDriver) return;

    try {
      await this.locationService.startTracking();
      this.driverStatus = 'available';
    } catch (error) {
      console.error('Erreur lors du démarrage du suivi:', error);
      this.addSystemAlert('warning', 'Géolocalisation non disponible. Certaines fonctionnalités seront limitées.', true);
    }
  }

  private stopLocationTracking(): void {
    if (this.currentDriver) {
      this.locationService.stopTracking();
    }
  }

  private async loadDeliveryStats(): Promise<void> {
    // Simuler le chargement des statistiques - à remplacer par un vrai service
    this.totalDeliveries = 12;
    this.completedDeliveries = 8;
    this.pendingDeliveries = 4;
    this.failedDeliveries = 0;
    this.totalDistance = 45.7;
    this.totalWorkTime = 6.5 * 3600; // 6.5 heures en secondes
  }

  private async checkActiveDeliveries(): Promise<void> {
    // Vérifier s'il y a des livraisons en cours
    // À implémenter selon votre logique métier
  }

  // Gestionnaires d'événements du composant de carte
  onDriverStatusChanged(status: string): void {
    this.driverStatus = status as any;
    if (status === 'busy') {
      this.isInDeliveryMode = true;
    } else {
      this.isInDeliveryMode = false;
    }
  }

  onDeliveryCompleted(delivery: Delivery): void {
    this.completedDeliveries++;
    this.pendingDeliveries = Math.max(0, this.pendingDeliveries - 1);
    this.addSystemAlert('success', `Livraison pour ${delivery.customerName} terminée avec succès !`, true);
  }

  onDeliveryFailed(delivery: Delivery): void {
    this.failedDeliveries++;
    this.pendingDeliveries = Math.max(0, this.pendingDeliveries - 1);
    this.addSystemAlert('error', `Échec de la livraison pour ${delivery.customerName}`, true);
  }

  onErrorOccurred(error: string): void {
    this.addSystemAlert('error', error, true);
  }

  // Actions utilisateur
  toggleOfflineMode(): void {
    this.isOfflineMode = !this.isOfflineMode;
    if (this.isOfflineMode) {
      this.driverStatus = 'offline';
      this.stopLocationTracking();
      this.addSystemAlert('info', 'Mode hors ligne activé', true);
    } else {
      this.startLocationTracking();
      this.addSystemAlert('success', 'Mode en ligne activé', true);
    }
  }

  openSettings(): void {
    // Ouvrir les paramètres - à implémenter
    console.log('Ouverture des paramètres');
  }

  // Gestion des alertes
  addSystemAlert(type: 'info' | 'warning' | 'error' | 'success', message: string, dismissible: boolean): void {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      dismissible
    };

    this.systemAlerts.push(alert);

    // Auto-suppression après 5 secondes pour les alertes dismissibles
    if (dismissible) {
      setTimeout(() => {
        this.dismissAlert(alert.id);
      }, 5000);
    }
  }

  dismissAlert(alertId: string): void {
    this.systemAlerts = this.systemAlerts.filter(alert => alert.id !== alertId);
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'error': return 'fa-exclamation-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'success': return 'fa-check-circle';
      default: return 'fa-info-circle';
    }
  }

  // Modal de fin de journée
  showEndWorkdayDialog(): void {
    this.showEndWorkdayModal = true;
  }

  cancelEndWorkday(): void {
    this.showEndWorkdayModal = false;
    this.endWorkdayNotes = '';
  }

  async confirmEndWorkday(): Promise<void> {
    try {
      // Logique de fin de journée
      this.stopLocationTracking();

      // Sauvegarder les notes et statistiques
      // À implémenter selon votre logique métier

      this.showEndWorkdayModal = false;
      this.addSystemAlert('success', 'Journée de travail terminée. À bientôt !', false);

      // Rediriger vers la page de connexion après 2 secondes
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de la fin de journée:', error);
      this.addSystemAlert('error', 'Erreur lors de la sauvegarde. Veuillez réessayer.', true);
    }
  }

  // Utilitaires
  getStatusLabel(status: string): string {
    switch (status) {
      case 'available': return 'Disponible';
      case 'busy': return 'En livraison';
      case 'offline': return 'Hors ligne';
      default: return 'Inconnu';
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }
}
