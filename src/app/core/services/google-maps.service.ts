/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @angular-eslint/prefer-inject */
/// <reference types="google.maps" />

import { Injectable, NgZone } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface MapOptions {
  center: google.maps.LatLngLiteral;
  zoom: number;
  mapTypeId?: google.maps.MapTypeId;
  styles?: google.maps.MapTypeStyle[];
  disableDefaultUI?: boolean;
  zoomControl?: boolean;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
}

export interface MarkerOptions {
  position: google.maps.LatLngLiteral;
  title?: string;
  icon?: string | google.maps.Icon | google.maps.Symbol;
  animation?: google.maps.Animation;
  draggable?: boolean;
  clickable?: boolean;
}

export interface DirectionsRequest {
  origin: google.maps.LatLngLiteral | string;
  destination: google.maps.LatLngLiteral | string;
  waypoints?: google.maps.DirectionsWaypoint[];
  travelMode?: google.maps.TravelMode;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  optimizeWaypoints?: boolean;
}

export interface RouteInfo {
  distance: string;
  duration: string;
  distanceValue: number;
  durationValue: number;
  steps: google.maps.DirectionsStep[];
  bounds: google.maps.LatLngBounds;
  overview_path: google.maps.LatLng[];
}

export interface RouteInfoWithDirections extends RouteInfo {
  directionsResult: google.maps.DirectionsResult;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private loader: Loader;
  private isLoaded$ = new BehaviorSubject<boolean>(false);
  private isLoading = false;

  // Services Google Maps
  private directionsService?: google.maps.DirectionsService;
  private directionsRenderer?: google.maps.DirectionsRenderer;
  private geocoder?: google.maps.Geocoder;
  private placesService?: google.maps.places.PlacesService;

  // Configuration par défaut pour la Tunisie
  private readonly DEFAULT_CENTER: google.maps.LatLngLiteral = {
    lat: 36.8065, // Tunis
    lng: 10.1815
  };

  private readonly DEFAULT_ZOOM = 13;

  // Styles de carte personnalisés
  private readonly MAP_STYLES: google.maps.MapTypeStyle[] = [
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

  constructor(private ngZone: NgZone) {
    this.loader = new Loader({
      apiKey: environment.googleMaps.apiKey,
      version: 'weekly',
      libraries: environment.googleMaps.libraries as any,
      language: environment.googleMaps.language,
      region: environment.googleMaps.region
    });
  }

  /**
   * Charge l'API Google Maps si pas déjà chargée
   */
  async loadGoogleMaps(): Promise<void> {
    if (this.isLoaded$.value) {
      return Promise.resolve();
    }

    if (this.isLoading) {
      return new Promise((resolve) => {
        const subscription = this.isLoaded$.subscribe(loaded => {
          if (loaded) {
            subscription.unsubscribe();
            resolve();
          }
        });
      });
    }

    this.isLoading = true;

    try {
      await this.loader.load();

      // Initialiser les services Google Maps
      this.directionsService = new google.maps.DirectionsService();
      this.directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });
      this.geocoder = new google.maps.Geocoder();

      this.ngZone.run(() => {
        this.isLoaded$.next(true);
        this.isLoading = false;
      });
    } catch (error) {
      this.isLoading = false;
      throw new Error(`Erreur lors du chargement de Google Maps: ${error}`);
    }
  }

  /**
   * Observable pour savoir si Google Maps est chargé
   */
  get isLoaded(): Observable<boolean> {
    return this.isLoaded$.asObservable();
  }

  /**
   * Créer une nouvelle carte
   */
  async createMap(element: HTMLElement, options?: Partial<MapOptions>): Promise<google.maps.Map> {
    await this.loadGoogleMaps();

    const mapOptions: google.maps.MapOptions = {
      center: options?.center || this.DEFAULT_CENTER,
      zoom: options?.zoom || this.DEFAULT_ZOOM,
      mapTypeId: options?.mapTypeId || google.maps.MapTypeId.ROADMAP,
      styles: options?.styles || this.MAP_STYLES,
      disableDefaultUI: options?.disableDefaultUI ?? false,
      zoomControl: options?.zoomControl ?? true,
      mapTypeControl: options?.mapTypeControl ?? false,
      streetViewControl: options?.streetViewControl ?? false,
      fullscreenControl: options?.fullscreenControl ?? true
    };

    return new google.maps.Map(element, mapOptions);
  }

  /**
   * Créer un marker
   */
  createMarker(map: google.maps.Map, options: MarkerOptions): google.maps.Marker {
    return new google.maps.Marker({
      map,
      position: options.position,
      title: options.title,
      icon: options.icon,
      animation: options.animation,
      draggable: options.draggable ?? false,
      clickable: options.clickable ?? true
    });
  }

  /**
   * Créer un InfoWindow
   */
  createInfoWindow(content: string | HTMLElement): google.maps.InfoWindow {
    return new google.maps.InfoWindow({
      content,
      maxWidth: 300
    });
  }

  /**
   * Calculer un itinéraire avec le résultat complet pour DirectionsRenderer
   */
  calculateRouteWithDirections(request: DirectionsRequest): Observable<RouteInfoWithDirections> {
    if (!this.directionsService) {
      return throwError(() => new Error('Service Directions non initialisé'));
    }

    const directionsRequest: google.maps.DirectionsRequest = {
      origin: request.origin,
      destination: request.destination,
      waypoints: request.waypoints,
      travelMode: request.travelMode || google.maps.TravelMode.DRIVING,
      avoidHighways: request.avoidHighways ?? false,
      avoidTolls: request.avoidTolls ?? false,
      optimizeWaypoints: request.optimizeWaypoints ?? false
    };

    return from(
      new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        this.directionsService!.route(directionsRequest, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Erreur de calcul d'itinéraire: ${status}`));
          }
        });
      })
    ).pipe(
      switchMap(result => {
        const route = result.routes[0];
        const leg = route.legs[0];

        const routeInfo: RouteInfoWithDirections = {
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          distanceValue: leg.distance?.value || 0,
          durationValue: leg.duration?.value || 0,
          steps: leg.steps,
          bounds: route.bounds,
          overview_path: route.overview_path,
          directionsResult: result
        };

        return Promise.resolve(routeInfo);
      }),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Calculer un itinéraire
   */
  calculateRoute(request: DirectionsRequest): Observable<RouteInfo> {
    if (!this.directionsService) {
      return throwError(() => new Error('Service Directions non initialisé'));
    }

    const directionsRequest: google.maps.DirectionsRequest = {
      origin: request.origin,
      destination: request.destination,
      waypoints: request.waypoints,
      travelMode: request.travelMode || google.maps.TravelMode.DRIVING,
      avoidHighways: request.avoidHighways ?? false,
      avoidTolls: request.avoidTolls ?? false,
      optimizeWaypoints: request.optimizeWaypoints ?? false
    };

    return from(
      new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        this.directionsService!.route(directionsRequest, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            resolve(result);
          } else {
            reject(new Error(`Erreur de calcul d'itinéraire: ${status}`));
          }
        });
      })
    ).pipe(
      switchMap(result => {
        const route = result.routes[0];
        const leg = route.legs[0];

        const routeInfo: RouteInfo = {
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || '',
          distanceValue: leg.distance?.value || 0,
          durationValue: leg.duration?.value || 0,
          steps: leg.steps,
          bounds: route.bounds,
          overview_path: route.overview_path
        };

        return Promise.resolve(routeInfo);
      }),
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Afficher un itinéraire sur la carte
   */
  async displayRoute(map: google.maps.Map, request: DirectionsRequest): Promise<RouteInfo> {
    if (!this.directionsService || !this.directionsRenderer) {
      throw new Error('Services Directions non initialisés');
    }

    const directionsRequest: google.maps.DirectionsRequest = {
      origin: request.origin,
      destination: request.destination,
      waypoints: request.waypoints,
      travelMode: request.travelMode || google.maps.TravelMode.DRIVING,
      avoidHighways: request.avoidHighways ?? false,
      avoidTolls: request.avoidTolls ?? false,
      optimizeWaypoints: request.optimizeWaypoints ?? false
    };

    return new Promise((resolve, reject) => {
      this.directionsService!.route(directionsRequest, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          this.directionsRenderer!.setMap(map);
          this.directionsRenderer!.setDirections(result);

          const route = result.routes[0];
          const leg = route.legs[0];

          const routeInfo: RouteInfo = {
            distance: leg.distance?.text || '',
            duration: leg.duration?.text || '',
            distanceValue: leg.distance?.value || 0,
            durationValue: leg.duration?.value || 0,
            steps: leg.steps,
            bounds: route.bounds,
            overview_path: route.overview_path
          };

          resolve(routeInfo);
        } else {
          reject(new Error(`Erreur d'affichage d'itinéraire: ${status}`));
        }
      });
    });
  }

  /**
   * Géocoder une adresse
   */
  geocodeAddress(address: string): Observable<google.maps.LatLngLiteral[]> {
    if (!this.geocoder) {
      return throwError(() => new Error('Service Geocoder non initialisé'));
    }

    return from(
      new Promise<google.maps.LatLngLiteral[]>((resolve, reject) => {
        this.geocoder!.geocode({ address }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results) {
            const locations = results.map(result => ({
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng()
            }));
            resolve(locations);
          } else {
            reject(new Error(`Erreur de géocodage: ${status}`));
          }
        });
      })
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Géocoder inverse (coordonnées -> adresse)
   */
  reverseGeocode(position: google.maps.LatLngLiteral): Observable<string[]> {
    if (!this.geocoder) {
      return throwError(() => new Error('Service Geocoder non initialisé'));
    }

    return from(
      new Promise<string[]>((resolve, reject) => {
        this.geocoder!.geocode({ location: position }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results) {
            const addresses = results.map(result => result.formatted_address);
            resolve(addresses);
          } else {
            reject(new Error(`Erreur de géocodage inverse: ${status}`));
          }
        });
      })
    ).pipe(
      catchError(error => throwError(() => error))
    );
  }

  /**
   * Calculer la distance entre deux points
   */
  calculateDistance(
    from: google.maps.LatLngLiteral,
    to: google.maps.LatLngLiteral
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(to.lat - from.lat);
    const dLng = this.deg2rad(to.lng - from.lng);

    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(from.lat)) * Math.cos(this.deg2rad(to.lat)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance en km
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Centrer la carte sur plusieurs markers
   */
  fitBounds(map: google.maps.Map, positions: google.maps.LatLngLiteral[]): void {
    if (positions.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    positions.forEach(position => {
      bounds.extend(position);
    });

    map.fitBounds(bounds);
  }

  /**
   * Nettoyer les ressources
   */
  cleanup(): void {
    if (this.directionsRenderer) {
      this.directionsRenderer.setMap(null);
    }
  }
}
