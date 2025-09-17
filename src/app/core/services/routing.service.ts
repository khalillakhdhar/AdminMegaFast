import { Injectable, NgZone } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { GeolocationPosition } from './geolocation.service';

export interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  travelMode?: google.maps.TravelMode;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  maneuver?: string;
}

export interface RouteResult {
  id: string;
  summary: string;
  distance: string;
  duration: string;
  steps: RouteStep[];
  polyline: string;
  bounds: google.maps.LatLngBounds;
  warnings: string[];
  copyrights: string;
  startAddress: string;
  endAddress: string;
}

export interface RoutingError {
  code: string;
  message: string;
  status: google.maps.DirectionsStatus;
}

@Injectable({
  providedIn: 'root'
})
export class RoutingService {
  private directionsService: google.maps.DirectionsService | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;
  private currentRoute$ = new BehaviorSubject<RouteResult | null>(null);
  private isCalculating$ = new BehaviorSubject<boolean>(false);
  private error$ = new BehaviorSubject<RoutingError | null>(null);
  private destroy$ = new Subject<void>();

  constructor(private ngZone: NgZone) {
    this.initializeGoogleMaps();
  }

  /**
   * Observable de la route actuelle
   */
  get currentRoute(): Observable<RouteResult | null> {
    return this.currentRoute$.asObservable();
  }

  /**
   * Observable du statut de calcul
   */
  get isCalculating(): Observable<boolean> {
    return this.isCalculating$.asObservable();
  }

  /**
   * Observable des erreurs
   */
  get error(): Observable<RoutingError | null> {
    return this.error$.asObservable();
  }

  /**
   * Initialiser les services Google Maps
   */
  private initializeGoogleMaps(): void {
    if (typeof google !== 'undefined' && google.maps) {
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        suppressInfoWindows: false,
        draggable: false
      });
    } else {
      // Attendre que Google Maps soit chargé
      const checkGoogleMaps = () => {
        if (typeof google !== 'undefined' && google.maps) {
          this.directionsService = new google.maps.DirectionsService();
          this.directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: false,
            suppressInfoWindows: false,
            draggable: false
          });
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
    }
  }

  /**
   * Calculer un itinéraire entre deux points
   */
  async calculateRoute(request: RouteRequest): Promise<RouteResult> {
    if (!this.directionsService) {
      throw new Error('Service de directions Google Maps non initialisé');
    }

    this.ngZone.run(() => {
      this.isCalculating$.next(true);
      this.error$.next(null);
    });

    const directionsRequest: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(request.origin.lat, request.origin.lng),
      destination: new google.maps.LatLng(request.destination.lat, request.destination.lng),
      travelMode: request.travelMode || google.maps.TravelMode.DRIVING,
      avoidHighways: request.avoidHighways || false,
      avoidTolls: request.avoidTolls || false,
      optimizeWaypoints: true,
      language: 'fr'
    };

    return new Promise((resolve, reject) => {
      this.directionsService!.route(directionsRequest, (result, status) => {
        this.ngZone.run(() => {
          this.isCalculating$.next(false);

          if (status === google.maps.DirectionsStatus.OK && result) {
            const route = this.parseDirectionsResult(result);
            this.currentRoute$.next(route);
            resolve(route);
          } else {
            const error: RoutingError = {
              code: 'DIRECTIONS_ERROR',
              message: this.getDirectionsErrorMessage(status),
              status: status
            };
            this.error$.next(error);
            reject(error);
          }
        });
      });
    });
  }

  /**
   * Calculer un itinéraire depuis une position GeolocationPosition
   */
  async calculateRouteFromPosition(
    currentPosition: GeolocationPosition,
    destination: { lat: number; lng: number },
    options?: Partial<RouteRequest>
  ): Promise<RouteResult> {
    const request: RouteRequest = {
      origin: { lat: currentPosition.lat, lng: currentPosition.lng },
      destination,
      ...options
    };

    return this.calculateRoute(request);
  }

  /**
   * Calculer un itinéraire vers une adresse
   */
  async calculateRouteToAddress(
    origin: { lat: number; lng: number },
    destinationAddress: string,
    options?: Partial<RouteRequest>
  ): Promise<RouteResult> {
    // Géocoder l'adresse pour obtenir les coordonnées
    const geocoder = new google.maps.Geocoder();

    return new Promise((resolve, reject) => {
      geocoder.geocode({ address: destinationAddress }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
          const location = results[0].geometry.location;
          const request: RouteRequest = {
            origin,
            destination: { lat: location.lat(), lng: location.lng() },
            ...options
          };

          this.calculateRoute(request)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`Impossible de géocoder l'adresse: ${destinationAddress}`));
        }
      });
    });
  }

  /**
   * Afficher un itinéraire sur une carte
   */
  displayRouteOnMap(map: google.maps.Map, route?: RouteResult): void {
    if (!this.directionsRenderer) {
      console.error('DirectionsRenderer non initialisé');
      return;
    }

    this.directionsRenderer.setMap(map);

    if (route) {
      // Si une route spécifique est fournie, l'afficher
      // Note: Nous aurions besoin du résultat original de DirectionsResult pour cela
      // Pour l'instant, nous utilisons la route actuelle
      const currentRoute = this.currentRoute$.value;
      if (currentRoute) {
        // Le renderer sera automatiquement mis à jour lors du prochain calcul
      }
    }
  }

  /**
   * Effacer l'itinéraire affiché sur la carte
   */
  clearRoute(): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.set('directions', null);
    }

    this.ngZone.run(() => {
      this.currentRoute$.next(null);
      this.error$.next(null);
    });
  }

  /**
   * Obtenir les étapes détaillées d'un itinéraire
   */
  getRouteSteps(route: RouteResult): RouteStep[] {
    return route.steps;
  }

  /**
   * Calculer la distance totale d'un itinéraire
   */
  getTotalDistance(route: RouteResult): number {
    // Extraire la valeur numérique de la distance
    const distanceText = route.distance.replace(/[^\d.,]/g, '');
    return parseFloat(distanceText.replace(',', '.'));
  }

  /**
   * Calculer la durée totale d'un itinéraire en minutes
   */
  getTotalDuration(route: RouteResult): number {
    // Extraire la valeur numérique de la durée
    const durationText = route.duration.replace(/[^\d]/g, '');
    return parseInt(durationText, 10);
  }

  /**
   * Parser le résultat des directions Google Maps
   */
  private parseDirectionsResult(result: google.maps.DirectionsResult): RouteResult {
    const route = result.routes[0];
    const leg = route.legs[0];

    const steps: RouteStep[] = leg.steps.map(step => ({
      instruction: step.instructions,
      distance: step.distance?.text || '',
      duration: step.duration?.text || '',
      startLocation: {
        lat: step.start_location.lat(),
        lng: step.start_location.lng()
      },
      endLocation: {
        lat: step.end_location.lat(),
        lng: step.end_location.lng()
      },
      maneuver: step.maneuver
    }));

    return {
      id: Date.now().toString(),
      summary: route.summary,
      distance: leg.distance?.text || '',
      duration: leg.duration?.text || '',
      steps,
      polyline: route.overview_polyline,
      bounds: route.bounds,
      warnings: route.warnings,
      copyrights: route.copyrights,
      startAddress: leg.start_address,
      endAddress: leg.end_address
    };
  }

  /**
   * Obtenir le message d'erreur selon le statut
   */
  private getDirectionsErrorMessage(status: google.maps.DirectionsStatus): string {
    switch (status) {
      case google.maps.DirectionsStatus.NOT_FOUND:
        return 'Aucun itinéraire trouvé entre ces points';
      case google.maps.DirectionsStatus.ZERO_RESULTS:
        return 'Aucun itinéraire disponible';
      case google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
        return 'Trop de points de passage';
      case google.maps.DirectionsStatus.INVALID_REQUEST:
        return 'Demande d\'itinéraire invalide';
      case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
        return 'Limite de requêtes dépassée';
      case google.maps.DirectionsStatus.REQUEST_DENIED:
        return 'Demande d\'itinéraire refusée';
      case google.maps.DirectionsStatus.UNKNOWN_ERROR:
        return 'Erreur inconnue lors du calcul de l\'itinéraire';
      default:
        return 'Erreur lors du calcul de l\'itinéraire';
    }
  }

  /**
   * Nettoyer les ressources
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearRoute();
  }
}
