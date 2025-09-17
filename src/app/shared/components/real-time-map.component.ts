import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input } from '@angular/core';
import { Observable, Subject, combineLatest, timer } from 'rxjs';
import { takeUntil, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

import { GoogleMapsService } from '../../core/services/google-maps.service';
import { LocationTrackingService, LocationUpdate } from '../../core/services/location-tracking.service';
import { RouteCalculationService } from '../../core/services/route-calculation.service';
import { MapMarker, MapRoute, RealTimeMapState, DeliveryMapMarker } from '../../core/models/map.model';

@Component({
  selector: 'app-real-time-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './real-time-map.component.html',
  styleUrls: ['./real-time-map.component.scss']
})
export class RealTimeMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @Input() height: string = '500px';
  @Input() autoRefresh: boolean = true;
  @Input() refreshInterval: number = 5000; // 5 secondes

  // État de la carte
  mapState: RealTimeMapState = {
    activeDrivers: [],
    activeRoutes: [],
    infoWindows: [],
    filterOptions: {
      showOnlineOnly: true,
      showRoutes: true,
      driverStatus: ['online', 'busy', 'available'],
      timeRange: {}
    },
    mapCenter: { lat: 36.8, lng: 10.18 }, // Tunis par défaut
    mapZoom: 10
  };

  // Variables supplémentaires pour le tracking
  isLoading = false;
  lastUpdate = Date.now();

  // Observables
  driversLocations$!: Observable<LocationUpdate[]>;
  private destroy$ = new Subject<void>();

  // Variables privées
  private map: google.maps.Map | null = null;
  private markers: Map<string, google.maps.Marker> = new Map();
  private routes: Map<string, google.maps.DirectionsRenderer> = new Map();
  private infoWindow: google.maps.InfoWindow | null = null;

  constructor(
    private googleMapsService: GoogleMapsService,
    private locationTrackingService: LocationTrackingService,
    private routeCalculationService: RouteCalculationService
  ) {}

  async ngOnInit() {
    await this.initializeMap();
    this.setupLocationTracking();
    this.setupAutoRefresh();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialiser la carte Google Maps
   */
  private async initializeMap(): Promise<void> {
    try {
      this.isLoading = true;

      this.map = await this.googleMapsService.createMap(
        this.mapContainer.nativeElement,
        {
          center: this.mapState.mapCenter,
          zoom: this.mapState.mapZoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: this.getMapStyles(),
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true
        }
      );

      // Créer l'InfoWindow
      this.infoWindow = new google.maps.InfoWindow({
        maxWidth: 300
      });

      this.isLoading = false;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
      this.isLoading = false;
    }
  }

  /**
   * Configurer le tracking des localisations
   */
  private setupLocationTracking(): void {
    this.driversLocations$ = this.locationTrackingService.getActiveDriversLocations();

    this.driversLocations$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) =>
          JSON.stringify(prev) === JSON.stringify(curr)
        ),
        debounceTime(1000) // Éviter les mises à jour trop fréquentes
      )
      .subscribe({
        next: (locations) => {
          this.updateDriverMarkers(locations);
          this.lastUpdate = Date.now();
        },
        error: (error) => {
          console.error('Erreur lors du tracking des drivers:', error);
        }
      });
  }

  /**
   * Configurer le rafraîchissement automatique
   */
  private setupAutoRefresh(): void {
    if (this.autoRefresh) {
      timer(0, this.refreshInterval)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          // Le tracking se fait déjà via l'Observable
          // Ici on peut ajouter d'autres données à rafraîchir
        });
    }
  }

  /**
   * Mettre à jour les marqueurs des drivers
   */
  private updateDriverMarkers(locations: LocationUpdate[]): void {
    if (!this.map) return;

    // Supprimer les marqueurs des drivers inactifs
    const activeDriverIds = new Set(locations.map(loc => loc.userId));
    for (const [driverId, marker] of this.markers) {
      if (!activeDriverIds.has(driverId)) {
        marker.setMap(null);
        this.markers.delete(driverId);
      }
    }

    // Mettre à jour ou créer les marqueurs
    locations.forEach(location => {
      this.updateDriverMarker(location);
    });

    // Mettre à jour l'état
    this.mapState.activeDrivers = Array.from(this.markers.keys()).map(driverId => {
      const location = locations.find(loc => loc.userId === driverId);
      return this.createMapMarkerFromLocation(location!);
    });
  }

  /**
   * Mettre à jour un marqueur de driver
   */
  private updateDriverMarker(location: LocationUpdate): void {
    if (!this.map) return;

    const position = { lat: location.latitude, lng: location.longitude };

    if (this.markers.has(location.userId)) {
      // Mettre à jour la position existante
      const marker = this.markers.get(location.userId)!;
      marker.setPosition(position);

      // Mettre à jour l'icône selon le statut
      marker.setIcon(this.getDriverIcon(location.status));
    } else {
      // Créer un nouveau marqueur
      const marker = new google.maps.Marker({
        position,
        map: this.map,
        title: `Driver ${location.userId}`,
        icon: this.getDriverIcon(location.status),
        animation: google.maps.Animation.DROP
      });

      // Ajouter l'événement click
      marker.addListener('click', () => {
        this.showDriverInfo(location, marker);
      });

      this.markers.set(location.userId, marker);
    }
  }

  /**
   * Afficher les informations d'un driver
   */
  private showDriverInfo(location: LocationUpdate, marker: google.maps.Marker): void {
    if (!this.infoWindow) return;

    const content = this.createDriverInfoContent(location);
    this.infoWindow.setContent(content);
    this.infoWindow.open(this.map, marker);
  }

  /**
   * Créer le contenu de l'InfoWindow pour un driver
   */
  private createDriverInfoContent(location: LocationUpdate): string {
    const lastUpdate = new Date(location.timestamp?.toDate?.() || Date.now()).toLocaleTimeString();

    return `
      <div class="driver-info">
        <h6><i class="fas fa-user-tie"></i> Driver ${location.userId}</h6>
        <div class="info-row">
          <span class="status-badge status-${location.status}">
            ${this.getStatusLabel(location.status)}
          </span>
        </div>
        <div class="info-row">
          <i class="fas fa-map-marker-alt"></i>
          <span>Lat: ${location.latitude.toFixed(6)}</span>
        </div>
        <div class="info-row">
          <i class="fas fa-map-marker-alt"></i>
          <span>Lng: ${location.longitude.toFixed(6)}</span>
        </div>
        <div class="info-row">
          <i class="fas fa-bullseye"></i>
          <span>Précision: ${location.accuracy}m</span>
        </div>
        ${location.speed ? `
          <div class="info-row">
            <i class="fas fa-tachometer-alt"></i>
            <span>Vitesse: ${Math.round(location.speed * 3.6)} km/h</span>
          </div>
        ` : ''}
        <div class="info-row">
          <i class="fas fa-clock"></i>
          <span>Dernière MAJ: ${lastUpdate}</span>
        </div>
        <div class="actions">
          <button class="btn btn-sm btn-primary" onclick="this.viewDriverDetails('${location.userId}')">
            <i class="fas fa-eye"></i> Détails
          </button>
          <button class="btn btn-sm btn-success" onclick="this.trackDriver('${location.userId}')">
            <i class="fas fa-route"></i> Suivre
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Obtenir l'icône selon le statut du driver
   */
  private getDriverIcon(status: string): google.maps.Icon {
    // Pour l'instant, utilisons des icônes colorées simples
    // Plus tard, nous remplacerons par des icônes personnalisées
    const colors: { [key: string]: string } = {
      'online': '#1cc88a',    // Vert
      'busy': '#f6c23e',      // Jaune
      'available': '#36b9cc', // Bleu
      'offline': '#e74a3b'    // Rouge
    };

    const color = colors[status] || colors['offline'];

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="26" r="12" fill="${color}" stroke="#fff" stroke-width="2"/>
          <circle cx="16" cy="26" r="6" fill="#fff"/>
          <path d="M16 8 L24 24 L16 20 L8 24 Z" fill="${color}" stroke="#fff" stroke-width="1"/>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(32, 32),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(16, 32)
    };
  }

  /**
   * Obtenir le label du statut
   */
  private getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'online': 'En ligne',
      'busy': 'Occupé',
      'available': 'Disponible',
      'offline': 'Hors ligne'
    };
    return labels[status] || 'Inconnu';
  }

  /**
   * Créer un MapMarker à partir d'une LocationUpdate
   */
  private createMapMarkerFromLocation(location: LocationUpdate): MapMarker {
    return {
      id: location.userId,
      position: { lat: location.latitude, lng: location.longitude },
      type: 'driver',
      title: `Driver ${location.userId}`,
      status: location.status,
      icon: {
        url: this.getDriverIcon(location.status).url,
        scaledSize: this.getDriverIcon(location.status).scaledSize,
        origin: this.getDriverIcon(location.status).origin,
        anchor: this.getDriverIcon(location.status).anchor
      },
      data: location
    };
  }

  /**
   * Styles personnalisés de la carte
   */
  private getMapStyles(): google.maps.MapTypeStyle[] {
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }

  /**
   * Centrer la carte sur tous les drivers
   */
  centerOnDrivers(): void {
    if (!this.map || this.markers.size === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach(marker => {
      bounds.extend(marker.getPosition()!);
    });

    this.map.fitBounds(bounds);
  }

  /**
   * Filtrer les drivers par statut
   */
  filterDriversByStatus(statuses: string[]): void {
    this.mapState.filterOptions.driverStatus = statuses;
    // Re-filtrer les marqueurs existants
    this.markers.forEach((marker, driverId) => {
      const location = this.mapState.activeDrivers.find(m => m.id === driverId);
      if (location && statuses.includes(location.status || '')) {
        marker.setVisible(true);
      } else {
        marker.setVisible(false);
      }
    });
  }

  /**
   * Afficher/masquer les routes
   */
  toggleRoutes(show: boolean): void {
    this.mapState.filterOptions.showRoutes = show;
    this.routes.forEach(route => {
      route.setMap(show ? this.map : null);
    });
  }

  /**
   * Méthodes publiques pour les actions
   */
  viewDriverDetails(driverId: string): void {
    // Émettre un événement ou naviguer vers la page de détails
    console.log('Voir détails driver:', driverId);
  }

  trackDriver(driverId: string): void {
    // Commencer le suivi d'un driver spécifique
    console.log('Suivre driver:', driverId);

    // Centrer la carte sur ce driver
    const marker = this.markers.get(driverId);
    if (marker && this.map) {
      this.map.setCenter(marker.getPosition()!);
      this.map.setZoom(16);
    }
  }

  /**
   * Rafraîchir manuellement
   */
  refresh(): void {
    this.lastUpdate = Date.now();
    // Les données se mettent à jour automatiquement via l'Observable
  }

  /**
   * Basculer un filtre de statut
   */
  toggleStatusFilter(status: string): void {
    const currentStatuses = [...this.mapState.filterOptions.driverStatus];
    const index = currentStatuses.indexOf(status);

    if (index > -1) {
      currentStatuses.splice(index, 1);
    } else {
      currentStatuses.push(status);
    }

    this.filterDriversByStatus(currentStatuses);
  }

  /**
   * Obtenir les drivers par statut
   */
  getDriversByStatus(status: string): MapMarker[] {
    return this.mapState.activeDrivers.filter(marker => marker.status === status);
  }
}
