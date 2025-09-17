import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject, fromEvent, timer } from 'rxjs';
import { takeUntil, startWith, switchMap, catchError } from 'rxjs/operators';

export interface GeolocationPosition {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  timestamp: number;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private currentPosition$ = new BehaviorSubject<GeolocationPosition | null>(null);
  private isTracking$ = new BehaviorSubject<boolean>(false);
  private error$ = new BehaviorSubject<GeolocationError | null>(null);
  private watchId: number | null = null;
  private destroy$ = new Subject<void>();

  // Options par défaut pour la géolocalisation
  private readonly defaultOptions: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000
  };

  constructor(private ngZone: NgZone) {
    // Vérifier si la géolocalisation est supportée
    if (!this.isGeolocationSupported()) {
      this.error$.next({
        code: -1,
        message: 'Géolocalisation non supportée par ce navigateur',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Vérifier si la géolocalisation est supportée
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Observable de la position actuelle
   */
  get currentPosition(): Observable<GeolocationPosition | null> {
    return this.currentPosition$.asObservable();
  }

  /**
   * Observable du statut de tracking
   */
  get isTracking(): Observable<boolean> {
    return this.isTracking$.asObservable();
  }

  /**
   * Observable des erreurs
   */
  get error(): Observable<GeolocationError | null> {
    return this.error$.asObservable();
  }

  /**
   * Obtenir la position actuelle une seule fois
   */
  async getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
    if (!this.isGeolocationSupported()) {
      throw new Error('Géolocalisation non supportée');
    }

    const geoOptions = { ...this.defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPosition: GeolocationPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            altitude: position.coords.altitude || undefined,
            timestamp: Date.now()
          };

          this.ngZone.run(() => {
            this.currentPosition$.next(geoPosition);
            this.error$.next(null);
          });

          resolve(geoPosition);
        },
        (error) => {
          const geoError: GeolocationError = {
            code: error.code,
            message: this.getErrorMessage(error.code),
            timestamp: Date.now()
          };

          this.ngZone.run(() => {
            this.error$.next(geoError);
          });

          reject(geoError);
        },
        geoOptions
      );
    });
  }

  /**
   * Démarrer le suivi de position en temps réel
   */
  startTracking(options?: GeolocationOptions): Observable<GeolocationPosition> {
    if (!this.isGeolocationSupported()) {
      throw new Error('Géolocalisation non supportée');
    }

    if (this.isTracking$.value) {
      return this.currentPosition$.asObservable().pipe(
        takeUntil(this.destroy$)
      ) as Observable<GeolocationPosition>;
    }

    const geoOptions = { ...this.defaultOptions, ...options };

    return new Observable<GeolocationPosition>(observer => {
      this.ngZone.run(() => {
        this.isTracking$.next(true);
        this.error$.next(null);
      });

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const geoPosition: GeolocationPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            altitude: position.coords.altitude || undefined,
            timestamp: Date.now()
          };

          this.ngZone.run(() => {
            this.currentPosition$.next(geoPosition);
            observer.next(geoPosition);
          });
        },
        (error) => {
          const geoError: GeolocationError = {
            code: error.code,
            message: this.getErrorMessage(error.code),
            timestamp: Date.now()
          };

          this.ngZone.run(() => {
            this.error$.next(geoError);
            this.isTracking$.next(false);
          });

          observer.error(geoError);
        },
        geoOptions
      );

      // Cleanup lors de l'unsubscribe
      return () => {
        this.stopTracking();
      };
    }).pipe(
      takeUntil(this.destroy$)
    );
  }

  /**
   * Arrêter le suivi de position
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.ngZone.run(() => {
      this.isTracking$.next(false);
    });
  }

  /**
   * Calculer la distance entre deux positions
   */
  calculateDistance(pos1: GeolocationPosition, pos2: GeolocationPosition): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(pos2.lat - pos1.lat);
    const dLng = this.deg2rad(pos2.lng - pos1.lng);

    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(pos1.lat)) * Math.cos(this.deg2rad(pos2.lat)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance en km
  }

  /**
   * Calculer la vitesse moyenne entre deux positions
   */
  calculateSpeed(pos1: GeolocationPosition, pos2: GeolocationPosition): number {
    const distance = this.calculateDistance(pos1, pos2);
    const timeDiff = (pos2.timestamp - pos1.timestamp) / 1000; // en secondes

    if (timeDiff === 0) return 0;

    return (distance * 1000) / timeDiff; // vitesse en m/s
  }

  /**
   * Vérifier si une position est dans un périmètre donné
   */
  isWithinRadius(
    position: GeolocationPosition,
    center: { lat: number; lng: number },
    radiusInMeters: number
  ): boolean {
    const distance = this.calculateDistance(position, {
      ...center,
      accuracy: 0,
      timestamp: Date.now()
    });

    return distance * 1000 <= radiusInMeters;
  }

  /**
   * Obtenir le message d'erreur selon le code
   */
  private getErrorMessage(errorCode: number): string {
    switch (errorCode) {
      case 1:
        return 'Permission de géolocalisation refusée';
      case 2:
        return 'Position indisponible';
      case 3:
        return 'Délai d\'attente dépassé';
      default:
        return 'Erreur de géolocalisation inconnue';
    }
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Nettoyer les ressources
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTracking();
  }
}
