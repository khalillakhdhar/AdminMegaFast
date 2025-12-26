/* eslint-disable @angular-eslint/prefer-inject */
/// <reference types="google.maps" />

import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
} from "@angular/core";
import { Subject, BehaviorSubject } from "rxjs";
import { takeUntil, distinctUntilChanged, debounceTime } from "rxjs/operators";
import { CommonModule } from "@angular/common";

import {
  GoogleMapsService,
  MapOptions,
} from "../../core/services/google-maps.service";
import {
  GeolocationService,
  GeolocationPosition,
} from "../../core/services/geolocation.service";
import { LocationTrackingService } from "../../core/services/location-tracking.service";
import { RouteCalculationService } from "../../core/services/route-calculation.service";
import { ShipmentService } from "../../core/services/shipment.service";
import { DriverMapState, DeliveryMapMarker } from "../../core/models/map.model";

@Component({
  selector: "app-delivery-map",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./delivery-map.component.html",
  styleUrls: ["./delivery-map.component.scss"],
})
export class DeliveryMapComponent implements OnInit, OnDestroy {
  @ViewChild("mapContainer", { static: true }) mapContainer!: ElementRef;
  @Input() driverId = "";
  @Input() height = "100vh";
  @Input() enableNavigation = true;
  @Input() isOfflineMode = false;
  @Output() deliveryStatusChange = new EventEmitter<{
    deliveryId: string;
    status: string;
  }>();
  @Output() arrivedAtDestination = new EventEmitter<DeliveryMapMarker>();

  // État de la carte driver
  mapState: DriverMapState = {
    deliveryMarkers: [],
    navigationMode: "overview",
    routeProgress: {
      distanceRemaining: "",
      timeRemaining: "",
      progress: 0,
    },
  };

  // Variables de contrôle
  isLoading = false;
  isNavigating = false;
  followUserLocation = true;
  showTraffic = true;
  voiceGuidance = true;

  // Observables
  private currentPosition$ = new BehaviorSubject<GeolocationPosition | null>(
    null
  );
  private destroy$ = new Subject<void>();

  // Variables privées
  private map: google.maps.Map | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;
  private userLocationMarker: google.maps.Marker | null = null;
  private deliveryMarkers = new Map<string, google.maps.Marker>();
  private watchPositionId: string | null = null;
  private trafficLayer: google.maps.TrafficLayer | null = null;

  constructor(
    private googleMapsService: GoogleMapsService,
    private geolocationService: GeolocationService,
    private locationTrackingService: LocationTrackingService,
    private routeCalculationService: RouteCalculationService,
    private shipmentService: ShipmentService
  ) {}

  async ngOnInit() {
    await this.initializeMap();
    this.setupLocationTracking();
    this.setupNavigation();
    this.loadDeliveries();
  }

  ngOnDestroy() {
    this.stopLocationTracking();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialiser la carte pour mobile
   */
  private async initializeMap(): Promise<void> {
    try {
      this.isLoading = true;

      // Configuration mobile-first
      const mapOptions: Partial<MapOptions> = {
        center: { lat: 36.8, lng: 10.18 }, // Tunis par défaut
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true, // Interface épurée pour mobile
        zoomControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        styles: this.getMobileMapStyles(),
      };

      this.map = await this.googleMapsService.createMap(
        this.mapContainer.nativeElement,
        mapOptions
      );

      // Configurer le renderer des directions
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: "#4285F4",
          strokeWeight: 6,
          strokeOpacity: 0.8,
        },
      });
      this.directionsRenderer.setMap(this.map);

      // Layer de trafic si activé
      if (this.showTraffic) {
        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(this.map);
      }

      this.isLoading = false;
    } catch (error) {
      console.error("Erreur lors de l'initialisation de la carte:", error);
      this.isLoading = false;
    }
  }

  /**
   * Configurer le tracking de position
   */
  private setupLocationTracking(): void {
    if (!this.geolocationService.isGeolocationSupported()) {
      console.error("Géolocalisation non supportée");
      return;
    }

    // Démarrer le tracking avec haute précision
    this.geolocationService
      .startTracking({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000,
      })
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged(
          (prev, curr) => prev.lat === curr.lat && prev.lng === curr.lng
        )
      )
      .subscribe({
        next: (position) => {
          this.updateUserLocation(position);
          this.currentPosition$.next(position);

          // Mettre à jour la progression si en navigation
          if (this.isNavigating && this.mapState.destination) {
            this.updateNavigationProgress(position);
          }
        },
        error: (error) => {
          console.error("Erreur de géolocalisation:", error);
        },
      });
  }

  /**
   * Configurer la navigation
   */
  private setupNavigation(): void {
    // Écouter les changements de position pour la navigation
    this.currentPosition$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged(),
        debounceTime(2000) // Éviter les mises à jour trop fréquentes
      )
      .subscribe((position) => {
        if (position && this.isNavigating) {
          this.updateRoute();
        }
      });
  }

  /**
   * Charger les livraisons du driver
   */
  private async loadDeliveries(): Promise<void> {
    // Charger les livraisons assignées au driver depuis Firestore
    if (!this.driverId) {
      console.warn("No driver ID provided, using current position only");
      return;
    }

    this.shipmentService
      .list({
        assignedTo: this.driverId,
        status: "in_transit",
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe((shipments) => {
        // Filter shipments with valid GPS coordinates
        const shipmentsWithGps = shipments.filter((sh) => {
          const gps =
            sh.deliveryGeo || sh.geo || sh.recipientAddress?.coordinates;
          return gps?.lat && gps?.lng;
        });

        const deliveries: DeliveryMapMarker[] = shipmentsWithGps.map((sh) => {
          const gps =
            sh.deliveryGeo || sh.geo || sh.recipientAddress?.coordinates;
          const recipientName = sh.recipient?.name || sh.clientName || "Client";
          const recipientPhone = sh.recipient?.phone || sh.clientPhone || "";
          const address =
            typeof sh.recipientAddress === "object"
              ? sh.recipientAddress?.line1 || sh.address || ""
              : sh.address || "";

          return {
            id: sh.id || "",
            position: {
              lat: gps!.lat,
              lng: gps!.lng,
            },
            type: "delivery" as const,
            title: `Livraison #${sh.barcode || sh.id?.substring(0, 8)}`,
            deliveryStatus:
              sh.status === "in_transit"
                ? ("pending" as const)
                : ("delivered" as const),
            priority: sh.priority || "normal",
            customerInfo: {
              name: recipientName,
              phone: recipientPhone,
              address: address,
            },
            deliveryInstructions: sh.notes || "",
            estimatedArrival: sh.estimatedDeliveryDate
              ? new Date(sh.estimatedDeliveryDate)
              : new Date(Date.now() + 30 * 60 * 1000),
          };
        });

        this.mapState.deliveryMarkers = deliveries;
        this.addDeliveryMarkersToMap();

        // Définir la prochaine livraison
        this.mapState.nextDelivery = deliveries.find(
          (d) => d.deliveryStatus === "pending"
        );
      });
  }

  /**
   * Mettre à jour la position de l'utilisateur
   */
  private updateUserLocation(position: GeolocationPosition): void {
    if (!this.map) return;

    const userPosition = { lat: position.lat, lng: position.lng };
    this.mapState.currentPosition = position;

    // Créer ou mettre à jour le marqueur utilisateur
    if (!this.userLocationMarker) {
      this.userLocationMarker = new google.maps.Marker({
        position: userPosition,
        map: this.map,
        icon: {
          url: this.getUserLocationIcon(),
          scaledSize: new google.maps.Size(20, 20),
          anchor: new google.maps.Point(10, 10),
        },
        title: "Ma position",
      });
    } else {
      this.userLocationMarker.setPosition(userPosition);
    }

    // Centrer la carte sur l'utilisateur si en mode suivi
    if (this.followUserLocation) {
      this.map.setCenter(userPosition);
    }

    // Envoyer la position au service de tracking
    if (this.watchPositionId && this.driverId) {
      this.locationTrackingService
        .updateUserStatus(this.driverId, "available")
        .catch(() => {
          // Silently ignore status update errors
        });
    }
  }

  /**
   * Ajouter les marqueurs de livraison
   */
  private addDeliveryMarkersToMap(): void {
    if (!this.map) return;

    this.mapState.deliveryMarkers.forEach((delivery) => {
      const marker = new google.maps.Marker({
        position: delivery.position,
        map: this.map,
        title: delivery.title,
        icon: this.getDeliveryIcon(delivery.priority, delivery.deliveryStatus),
      });

      // InfoWindow avec détails de livraison
      const infoWindow = new google.maps.InfoWindow({
        content: this.createDeliveryInfoContent(delivery),
      });

      marker.addListener("click", () => {
        infoWindow.open(this.map, marker);
      });

      this.deliveryMarkers.set(delivery.id, marker);
    });
  }

  /**
   * Démarrer la navigation vers une livraison
   */
  async startNavigation(delivery: DeliveryMapMarker): Promise<void> {
    if (!this.mapState.currentPosition || !this.map) {
      console.error("Position actuelle non disponible");
      return;
    }

    try {
      this.isNavigating = true;
      this.mapState.navigationMode = "navigation";
      this.mapState.destination = delivery.position;
      this.mapState.nextDelivery = delivery;

      // Calculer la route
      const routeInfo =
        await this.routeCalculationService.calculateRouteWithDirections({
          origin: {
            lat: this.mapState.currentPosition.lat,
            lng: this.mapState.currentPosition.lng,
          },
          destination: delivery.position,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
          avoidTolls: false,
        });

      // Afficher la route
      if (this.directionsRenderer && routeInfo.directionsResult) {
        this.directionsRenderer.setDirections(routeInfo.directionsResult);
      }

      // Mettre à jour l'état
      this.mapState.routeProgress = {
        distanceRemaining: routeInfo.distance,
        timeRemaining: routeInfo.duration,
        progress: 0,
      };

      // Centrer sur la route
      this.centerOnRoute();

      // Activer la guidance vocale si demandée
      if (this.voiceGuidance) {
        this.speakDirection(
          `Navigation démarrée vers ${delivery.customerInfo?.name}. Distance: ${routeInfo.distance}, durée estimée: ${routeInfo.duration}`
        );
      }
    } catch (error) {
      console.error("Erreur lors du démarrage de la navigation:", error);
      this.isNavigating = false;
    }
  }

  /**
   * Arrêter la navigation
   */
  stopNavigation(): void {
    this.isNavigating = false;
    this.mapState.navigationMode = "overview";
    this.mapState.destination = undefined;
    this.mapState.routeProgress = {
      distanceRemaining: "",
      timeRemaining: "",
      progress: 0,
    };

    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({
        routes: [],
      } as google.maps.DirectionsResult);
    }
  }

  /**
   * Mettre à jour la progression de navigation
   */
  private updateNavigationProgress(position: GeolocationPosition): void {
    if (!this.mapState.destination) return;

    // Calculer la distance restante
    const distance = this.calculateDistance(
      position.lat,
      position.lng,
      this.mapState.destination.lat,
      this.mapState.destination.lng
    );

    // Vérifier si proche de la destination (< 50m)
    if (distance < 0.05) {
      // 50 mètres
      this.handleArrivalAtDestination();
    }

    // Mettre à jour la progression (basée sur la distance)
    const distanceStr = this.mapState.routeProgress.distanceRemaining;
    const totalDistance = parseFloat(distanceStr.replace(/[^\d.]/g, "")) || 0;
    if (totalDistance > 0 && distance < totalDistance) {
      this.mapState.routeProgress.progress = Math.max(
        0,
        Math.min(100, ((totalDistance - distance) / totalDistance) * 100)
      );
    }
  }

  /**
   * Gérer l'arrivée à destination
   */
  private handleArrivalAtDestination(): void {
    if (this.mapState.nextDelivery) {
      this.arrivedAtDestination.emit(this.mapState.nextDelivery);

      if (this.voiceGuidance) {
        this.speakDirection("Vous êtes arrivé à destination");
      }

      // Arrêter automatiquement la navigation
      this.stopNavigation();
    }
  }

  /**
   * Mettre à jour le statut d'une livraison
   */
  updateDeliveryStatus(
    deliveryId: string,
    status: "pending" | "in_progress" | "delivered" | "failed"
  ): void {
    const delivery = this.mapState.deliveryMarkers.find(
      (d) => d.id === deliveryId
    );
    if (delivery) {
      delivery.deliveryStatus = status;

      // Mettre à jour l'icône du marqueur
      const marker = this.deliveryMarkers.get(deliveryId);
      if (marker) {
        marker.setIcon(this.getDeliveryIcon(delivery.priority, status));
      }

      this.deliveryStatusChange.emit({ deliveryId, status });

      // Si livraison terminée, passer à la suivante
      if (status === "delivered") {
        this.moveToNextDelivery();
      }
    }
  }

  /**
   * Passer à la livraison suivante
   */
  private moveToNextDelivery(): void {
    const nextDelivery = this.mapState.deliveryMarkers.find(
      (d) => d.deliveryStatus === "pending"
    );
    if (nextDelivery) {
      this.mapState.nextDelivery = nextDelivery;
    } else {
      // Toutes les livraisons terminées
      this.mapState.nextDelivery = undefined;
      this.mapState.navigationMode = "overview";
    }
  }

  /**
   * Méthodes utilitaires
   */
  private getUserLocationIcon(): string {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" fill="#4285F4" stroke="#fff" stroke-width="2"/>
        <circle cx="10" cy="10" r="3" fill="#fff"/>
      </svg>
    `)}`;
  }

  private getDeliveryIcon(priority: string, status: string): google.maps.Icon {
    const colors = {
      pending: { high: "#e74c3c", normal: "#f39c12", low: "#95a5a6" },
      in_progress: { high: "#3498db", normal: "#3498db", low: "#3498db" },
      delivered: { high: "#27ae60", normal: "#27ae60", low: "#27ae60" },
      failed: { high: "#c0392b", normal: "#c0392b", low: "#c0392b" },
    };

    const color =
      colors[status as keyof typeof colors][
        priority as keyof typeof colors.pending
      ] || "#95a5a6";

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.2 0 0 7.2 0 16s16 24 16 24 16-15.2 16-24S24.8 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
          <circle cx="16" cy="16" r="8" fill="#fff"/>
          <text x="16" y="20" text-anchor="middle" fill="${color}" font-size="8" font-weight="bold">${priority
        .charAt(0)
        .toUpperCase()}</text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(32, 40),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(16, 40),
    };
  }

  private createDeliveryInfoContent(delivery: DeliveryMapMarker): string {
    const statusClass = `status-${delivery.deliveryStatus}`;
    const priorityClass = `priority-${delivery.priority}`;

    return `
      <div class="delivery-info">
        <h6>${delivery.title}</h6>
        <div class="customer-info">
          <strong>${delivery.customerInfo?.name}</strong><br>
          <i class="fas fa-phone"></i> ${delivery.customerInfo?.phone}<br>
          <i class="fas fa-map-marker-alt"></i> ${
            delivery.customerInfo?.address
          }
        </div>
        ${
          delivery.deliveryInstructions
            ? `
          <div class="instructions">
            <i class="fas fa-info-circle"></i> ${delivery.deliveryInstructions}
          </div>
        `
            : ""
        }
        <div class="status-priority">
          <span class="badge ${statusClass}">${this.getStatusLabel(
      delivery.deliveryStatus
    )}</span>
          <span class="badge ${priorityClass}">${this.getPriorityLabel(
      delivery.priority
    )}</span>
        </div>
        <div class="actions">
          <button onclick="this.startNavigation('${
            delivery.id
          }')" class="btn btn-primary btn-sm">
            <i class="fas fa-route"></i> Navigation
          </button>
          <button onclick="this.updateStatus('${
            delivery.id
          }', 'in_progress')" class="btn btn-warning btn-sm">
            <i class="fas fa-play"></i> Démarrer
          </button>
        </div>
      </div>
    `;
  }

  private getStatusLabel(status: string): string {
    const labels = {
      pending: "En attente",
      in_progress: "En cours",
      delivered: "Livré",
      failed: "Échec",
    };
    return labels[status as keyof typeof labels] || status;
  }

  private getPriorityLabel(priority: string): string {
    const labels = {
      low: "Basse",
      normal: "Normale",
      high: "Haute",
      urgent: "Urgente",
    };
    return labels[priority as keyof typeof labels] || priority;
  }

  private getMobileMapStyles(): google.maps.MapTypeStyle[] {
    return [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "transit.station",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "road",
        elementType: "labels",
        stylers: [{ visibility: "simplified" }],
      },
    ];
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private centerOnRoute(): void {
    if (
      !this.map ||
      !this.mapState.currentPosition ||
      !this.mapState.destination
    )
      return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({
      lat: this.mapState.currentPosition.lat,
      lng: this.mapState.currentPosition.lng,
    });
    bounds.extend(this.mapState.destination);
    this.map.fitBounds(bounds);
  }

  private async updateRoute(): Promise<void> {
    if (!this.mapState.currentPosition || !this.mapState.destination) return;

    try {
      const routeInfo =
        await this.routeCalculationService.calculateRouteWithDirections({
          origin: {
            lat: this.mapState.currentPosition.lat,
            lng: this.mapState.currentPosition.lng,
          },
          destination: this.mapState.destination,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
          avoidTolls: false,
        });

      this.mapState.routeProgress.distanceRemaining = routeInfo.distance;
      this.mapState.routeProgress.timeRemaining = routeInfo.duration;

      if (this.directionsRenderer && routeInfo.directionsResult) {
        this.directionsRenderer.setDirections(routeInfo.directionsResult);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la route:", error);
    }
  }

  private speakDirection(text: string): void {
    if ("speechSynthesis" in window && this.voiceGuidance) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }

  private async startLocationTracking(): Promise<void> {
    try {
      this.watchPositionId = await this.locationTrackingService.startTracking();
    } catch (error) {
      console.error("Erreur lors du démarrage du tracking:", error);
    }
  }

  private stopLocationTracking(): void {
    if (this.watchPositionId) {
      this.locationTrackingService.stopTracking();
      this.watchPositionId = null;
    }
  }

  // Méthodes publiques pour les actions
  toggleTraffic(): void {
    this.showTraffic = !this.showTraffic;

    if (!this.map) return;

    if (this.showTraffic) {
      if (!this.trafficLayer) {
        this.trafficLayer = new google.maps.TrafficLayer();
      }
      this.trafficLayer.setMap(this.map);
    } else if (this.trafficLayer) {
      this.trafficLayer.setMap(null);
    }
  }

  toggleFollowLocation(): void {
    this.followUserLocation = !this.followUserLocation;
    if (this.followUserLocation && this.mapState.currentPosition && this.map) {
      this.map.setCenter({
        lat: this.mapState.currentPosition.lat,
        lng: this.mapState.currentPosition.lng,
      });
    }
  }

  toggleVoiceGuidance(): void {
    this.voiceGuidance = !this.voiceGuidance;
  }

  centerOnUser(): void {
    if (this.mapState.currentPosition && this.map) {
      this.map.setCenter({
        lat: this.mapState.currentPosition.lat,
        lng: this.mapState.currentPosition.lng,
      });
      this.map.setZoom(16);
    }
  }

  zoomIn(): void {
    if (this.map) {
      this.map.setZoom(this.map.getZoom()! + 1);
    }
  }

  zoomOut(): void {
    if (this.map) {
      this.map.setZoom(this.map.getZoom()! - 1);
    }
  }
}
