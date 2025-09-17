/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @angular-eslint/prefer-inject */
/// <reference types="google.maps" />

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { GoogleMapsService, DirectionsRequest, RouteInfo, RouteInfoWithDirections } from './google-maps.service';
import { GeolocationPosition } from './geolocation.service';

// Re-export RouteInfo pour les autres composants
export { RouteInfo, RouteInfoWithDirections } from './google-maps.service';

export interface DeliveryWaypoint {
  shipmentId: string;
  address: string;
  position: google.maps.LatLngLiteral;
  clientName: string;
  phoneNumber?: string;
  deliveryWindow?: {
    startTime: string;
    endTime: string;
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedDuration: number; // minutes
}

export interface OptimizedRoute {
  orderedWaypoints: DeliveryWaypoint[];
  totalDistance: string;
  totalDuration: string;
  totalDistanceValue: number; // en mètres
  totalDurationValue: number; // en secondes
  legs: RouteInfo[];
  estimatedFuelCost: number;
  routeEfficiencyScore: number; // 0-100
}

export interface RouteOptimizationOptions {
  startLocation: google.maps.LatLngLiteral;
  waypoints: DeliveryWaypoint[];
  endLocation?: google.maps.LatLngLiteral;
  maxWaypoints?: number;
  considerTraffic?: boolean;
  prioritizeDeliveryWindows?: boolean;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}

export interface LiveRouteUpdate {
  currentPosition: GeolocationPosition;
  nextWaypoint: DeliveryWaypoint;
  distanceToNext: string;
  timeToNext: string;
  remainingDeliveries: number;
  estimatedCompletionTime: Date;
  routeProgress: number; // 0-100%
}

@Injectable({
  providedIn: 'root'
})
export class RouteCalculationService {
  private currentRoute$ = new BehaviorSubject<OptimizedRoute | null>(null);
  private routeUpdates$ = new BehaviorSubject<LiveRouteUpdate | null>(null);

  // Configuration pour le coût du carburant (prix au km)
  private readonly FUEL_COST_PER_KM = 0.08; // TND par km
  private readonly AVERAGE_SPEED_CITY = 25; // km/h en ville
  private readonly DELIVERY_STOP_TIME = 5; // minutes par arrêt

  constructor(private googleMapsService: GoogleMapsService) {}

  /**
   * Calculer un itinéraire simple entre deux points avec DirectionsResult
   */
  async calculateRouteWithDirections(request: DirectionsRequest): Promise<RouteInfoWithDirections> {
    try {
      return await this.googleMapsService.calculateRouteWithDirections(request).toPromise() as RouteInfoWithDirections;
    } catch (error) {
      console.error('Erreur lors du calcul d\'itinéraire:', error);
      throw new Error('Impossible de calculer l\'itinéraire');
    }
  }

  /**
   * Calculer un itinéraire simple entre deux points
   */
  async calculateRoute(request: DirectionsRequest): Promise<RouteInfo> {
    try {
      return await this.googleMapsService.calculateRoute(request).toPromise() as RouteInfo;
    } catch (error) {
      console.error('Erreur lors du calcul d\'itinéraire:', error);
      throw new Error('Impossible de calculer l\'itinéraire');
    }
  }

  /**
   * Calculer un itinéraire optimisé pour les livraisons
   */
  async calculateOptimizedRoute(options: RouteOptimizationOptions): Promise<OptimizedRoute> {
    try {
      // Limiter le nombre de waypoints (Google Maps limite à 25)
      const maxWaypoints = Math.min(options.maxWaypoints || 23, 23);
      let waypoints = options.waypoints.slice(0, maxWaypoints);

      // Optimiser l'ordre des waypoints si nécessaire
      if (options.prioritizeDeliveryWindows) {
        waypoints = this.optimizeByDeliveryWindows(waypoints);
      } else {
        waypoints = this.optimizeByPriority(waypoints);
      }

      // Créer la requête de directions
      const directionsRequest: DirectionsRequest = {
        origin: options.startLocation,
        destination: options.endLocation || options.startLocation,
        waypoints: waypoints.map(wp => ({
          location: wp.position,
          stopover: true
        })),
        travelMode: google.maps.TravelMode.DRIVING,
        avoidHighways: options.avoidHighways || false,
        avoidTolls: options.avoidTolls || false,
        optimizeWaypoints: true
      };

      // Calculer l'itinéraire
      const routeInfo = await this.googleMapsService.calculateRoute(directionsRequest).toPromise();

      if (!routeInfo) {
        throw new Error('Impossible de calculer l\'itinéraire');
      }

      // Créer l'itinéraire optimisé
      const optimizedRoute: OptimizedRoute = {
        orderedWaypoints: waypoints,
        totalDistance: routeInfo.distance,
        totalDuration: routeInfo.duration,
        totalDistanceValue: routeInfo.distanceValue,
        totalDurationValue: routeInfo.durationValue,
        legs: [routeInfo],
        estimatedFuelCost: this.calculateFuelCost(routeInfo.distanceValue),
        routeEfficiencyScore: this.calculateEfficiencyScore(routeInfo, waypoints.length)
      };

      this.currentRoute$.next(optimizedRoute);
      return optimizedRoute;

    } catch (error) {
      console.error('Erreur lors du calcul d\'itinéraire:', error);
      throw error;
    }
  }

  /**
   * Calculer l'itinéraire vers le prochain point de livraison
   */
  calculateRouteToNextDelivery(
    currentPosition: GeolocationPosition,
    nextWaypoint: DeliveryWaypoint
  ): Observable<RouteInfo> {
    const directionsRequest: DirectionsRequest = {
      origin: { lat: currentPosition.lat, lng: currentPosition.lng },
      destination: nextWaypoint.position,
      travelMode: google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false
    };

    return this.googleMapsService.calculateRoute(directionsRequest);
  }

  /**
   * Mettre à jour la progression de l'itinéraire en temps réel
   */
  updateRouteProgress(
    currentPosition: GeolocationPosition,
    remainingWaypoints: DeliveryWaypoint[]
  ): Observable<LiveRouteUpdate> {
    if (remainingWaypoints.length === 0) {
      return throwError(() => new Error('Aucune livraison restante'));
    }

    const nextWaypoint = remainingWaypoints[0];

    return this.calculateRouteToNextDelivery(currentPosition, nextWaypoint).pipe(
      map(routeInfo => {
        const totalRemainingTime = this.estimateTotalRemainingTime(remainingWaypoints);
        const routeProgress = this.calculateRouteProgress(remainingWaypoints);

        const liveUpdate: LiveRouteUpdate = {
          currentPosition,
          nextWaypoint,
          distanceToNext: routeInfo.distance,
          timeToNext: routeInfo.duration,
          remainingDeliveries: remainingWaypoints.length,
          estimatedCompletionTime: new Date(Date.now() + totalRemainingTime * 60000),
          routeProgress
        };

        this.routeUpdates$.next(liveUpdate);
        return liveUpdate;
      }),
      catchError(error => {
        console.error('Erreur lors de la mise à jour de progression:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Recalculer l'itinéraire en cas de déviation
   */
  async recalculateRoute(
    currentPosition: GeolocationPosition,
    remainingWaypoints: DeliveryWaypoint[]
  ): Promise<OptimizedRoute> {
    const options: RouteOptimizationOptions = {
      startLocation: { lat: currentPosition.lat, lng: currentPosition.lng },
      waypoints: remainingWaypoints,
      prioritizeDeliveryWindows: true,
      avoidTolls: false,
      avoidHighways: false
    };

    return this.calculateOptimizedRoute(options);
  }

  /**
   * Obtenir l'itinéraire alternatif en cas de problème
   */
  async getAlternativeRoute(
    currentPosition: GeolocationPosition,
    destination: DeliveryWaypoint,
    avoidCurrentRoute = true
  ): Promise<RouteInfo[]> {
    const baseRequest: DirectionsRequest = {
      origin: { lat: currentPosition.lat, lng: currentPosition.lng },
      destination: destination.position,
      travelMode: google.maps.TravelMode.DRIVING
    };

    // Calculer plusieurs alternatives
    const alternatives: Promise<RouteInfo>[] = [
      // Route normale
      this.googleMapsService.calculateRoute(baseRequest).toPromise()!,

      // Route évitant les autoroutes
      this.googleMapsService.calculateRoute({
        ...baseRequest,
        avoidHighways: true
      }).toPromise()!,

      // Route évitant les péages
      this.googleMapsService.calculateRoute({
        ...baseRequest,
        avoidTolls: true
      }).toPromise()!
    ];

    try {
      const routes = await Promise.all(alternatives);
      return routes.filter(route => route !== null);
    } catch (error) {
      console.error('Erreur lors du calcul des routes alternatives:', error);
      throw error;
    }
  }

  /**
   * Estimer le temps de livraison total
   */
  estimateTotalDeliveryTime(waypoints: DeliveryWaypoint[]): number {
    const drivingTime = waypoints.reduce((total, wp) => total + wp.estimatedDuration, 0);
    const stopTime = waypoints.length * this.DELIVERY_STOP_TIME;
    return drivingTime + stopTime;
  }

  /**
   * Calculer les statistiques d'efficacité d'un itinéraire
   */
  calculateRouteEfficiency(route: OptimizedRoute): {
    distancePerDelivery: number;
    timePerDelivery: number;
    fuelEfficiency: number;
    scoreExplanation: string;
  } {
    const deliveryCount = route.orderedWaypoints.length;
    const distanceKm = route.totalDistanceValue / 1000;
    const timeHours = route.totalDurationValue / 3600;

    return {
      distancePerDelivery: +(distanceKm / deliveryCount).toFixed(2),
      timePerDelivery: +((route.totalDurationValue / 60) / deliveryCount).toFixed(1),
      fuelEfficiency: +(distanceKm / route.estimatedFuelCost).toFixed(2),
      scoreExplanation: this.getEfficiencyExplanation(route.routeEfficiencyScore)
    };
  }

  /**
   * Observable de l'itinéraire actuel
   */
  get currentRoute(): Observable<OptimizedRoute | null> {
    return this.currentRoute$.asObservable();
  }

  /**
   * Observable des mises à jour en temps réel
   */
  get routeUpdates(): Observable<LiveRouteUpdate | null> {
    return this.routeUpdates$.asObservable();
  }

  // Méthodes privées

  private optimizeByDeliveryWindows(waypoints: DeliveryWaypoint[]): DeliveryWaypoint[] {
    return waypoints.sort((a, b) => {
      // Prioriser par fenêtre de livraison puis par priorité
      if (a.deliveryWindow && b.deliveryWindow) {
        const aTime = this.timeToMinutes(a.deliveryWindow.startTime);
        const bTime = this.timeToMinutes(b.deliveryWindow.startTime);
        return aTime - bTime;
      }

      return this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority);
    });
  }

  private optimizeByPriority(waypoints: DeliveryWaypoint[]): DeliveryWaypoint[] {
    return waypoints.sort((a, b) =>
      this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority)
    );
  }

  private getPriorityWeight(priority: DeliveryWaypoint['priority']): number {
    const weights = { urgent: 4, high: 3, normal: 2, low: 1 };
    return weights[priority];
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateFuelCost(distanceInMeters: number): number {
    const distanceKm = distanceInMeters / 1000;
    return +(distanceKm * this.FUEL_COST_PER_KM).toFixed(2);
  }

  private calculateEfficiencyScore(routeInfo: RouteInfo, waypointCount: number): number {
    const distanceKm = routeInfo.distanceValue / 1000;
    const timeHours = routeInfo.durationValue / 3600;

    // Score basé sur distance/livraison et temps/livraison
    const distanceScore = Math.max(0, 100 - (distanceKm / waypointCount) * 10);
    const timeScore = Math.max(0, 100 - (timeHours / waypointCount) * 50);

    return Math.round((distanceScore + timeScore) / 2);
  }

  private estimateTotalRemainingTime(waypoints: DeliveryWaypoint[]): number {
    return waypoints.reduce((total, wp) => total + wp.estimatedDuration, 0) +
           (waypoints.length * this.DELIVERY_STOP_TIME);
  }

  private calculateRouteProgress(remainingWaypoints: DeliveryWaypoint[]): number {
    const currentRoute = this.currentRoute$.value;
    if (!currentRoute) return 0;

    const totalWaypoints = currentRoute.orderedWaypoints.length;
    const completed = totalWaypoints - remainingWaypoints.length;

    return Math.round((completed / totalWaypoints) * 100);
  }

  private getEfficiencyExplanation(score: number): string {
    if (score >= 80) return 'Excellent - Itinéraire très optimisé';
    if (score >= 60) return 'Bon - Itinéraire bien optimisé';
    if (score >= 40) return 'Moyen - Optimisation possible';
    return 'Faible - Itinéraire nécessite une optimisation';
  }
}
