import { Injectable } from "@angular/core";
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from "@angular/fire/compat/firestore";
import { Observable, BehaviorSubject, combineLatest, timer } from "rxjs";
import {
  map,
  switchMap,
  distinctUntilChanged,
  takeUntil,
} from "rxjs/operators";
import firebase from "firebase/compat/app";

import { GeolocationService, GeolocationPosition } from "./geolocation.service";
import { AuthenticationService } from "./auth.service";

// Interfaces pour le tracking de localisation
export interface LocationUpdate {
  id?: string;
  userId: string;
  userType: "driver" | "client";
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: any; // Firebase Timestamp
  status: "online" | "offline" | "busy" | "available";
  sessionId: string;
  lastUpdate: any; // Firebase Timestamp
}

export interface TrackingSession {
  sessionId: string;
  userId: string;
  startTime: any; // Firebase Timestamp
  endTime?: any; // Firebase Timestamp
  isActive: boolean;
  deviceInfo: any;
  totalDistance?: number;
  totalDuration?: number;
}

export interface GeofenceEvent {
  userId: string;
  zoneId: string;
  eventType: "enter" | "exit";
  timestamp: any; // Firebase Timestamp
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface GeofenceZone {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius: number; // in meters
  type: "delivery" | "warehouse" | "restricted";
}

@Injectable({
  providedIn: "root",
})
export class LocationTrackingService {
  private activeTracking$ = new BehaviorSubject<boolean>(false);
  private currentSessionId: string | null = null;
  private trackingSubscription: any;
  private geofenceZones: GeofenceZone[] = [];
  private userInsideZones = new Set<string>();

  constructor(
    private afs: AngularFirestore,
    private geolocationService: GeolocationService,
    private authService: AuthenticationService
  ) {}

  /**
   * Démarre le tracking de localisation pour l'utilisateur actuel
   */
  async startTracking(): Promise<string> {
    const currentUser = await this.authService.currentUser();
    if (!currentUser) {
      throw new Error("Utilisateur non connecté");
    }

    const sessionData: TrackingSession = {
      sessionId: this.generateSessionId(),
      userId: currentUser.uid,
      startTime: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      deviceInfo: this.getDeviceInfo(),
    };

    // Créer la session dans Firestore
    await this.afs
      .collection("tracking_sessions")
      .doc(sessionData.sessionId)
      .set(sessionData);
    this.currentSessionId = sessionData.sessionId;

    // Démarrer le tracking de position
    this.startPositionTracking();
    this.activeTracking$.next(true);

    return sessionData.sessionId;
  }

  /**
   * Arrêter le tracking
   */
  async stopTracking(): Promise<void> {
    this.geolocationService.stopTracking();
    this.activeTracking$.next(false);

    const currentUser = await this.authService.currentUser();
    if (!currentUser || !this.currentSessionId) {
      return;
    }

    // Mettre à jour le statut utilisateur
    await this.updateUserStatus(currentUser.uid, "offline");

    // Fermer la session
    await this.afs
      .collection("tracking_sessions")
      .doc(this.currentSessionId)
      .update({
        endTime: firebase.firestore.FieldValue.serverTimestamp(),
        isActive: false,
      });

    // Archiver l'historique
    await this.archiveLocationHistory(this.currentSessionId);

    this.currentSessionId = null;

    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
    }
  }

  /**
   * Obtenir la position en temps réel de tous les drivers actifs
   */
  getActiveDriversLocations(): Observable<LocationUpdate[]> {
    return this.afs
      .collection<LocationUpdate>(
        "locations",
        (ref) =>
          ref
            .where("userType", "==", "driver")
            .where("status", "in", ["online", "busy", "available"])
            .where("lastUpdate", ">", new Date(Date.now() - 5 * 60 * 1000)) // Dernières 5 minutes
      )
      .valueChanges();
  }

  /**
   * Obtenir la position d'un driver spécifique
   */
  getDriverLocation(driverId: string): Observable<LocationUpdate | null> {
    return this.afs
      .collection<LocationUpdate>("locations", (ref) =>
        ref
          .where("userId", "==", driverId)
          .where("userType", "==", "driver")
          .limit(1)
      )
      .valueChanges()
      .pipe(map((locations) => (locations.length > 0 ? locations[0] : null)));
  }

  /**
   * Mettre à jour le statut d'un utilisateur
   */
  async updateUserStatus(
    userId: string,
    status: "online" | "offline" | "busy" | "available"
  ): Promise<void> {
    const userDoc = this.afs.collection("locations").doc(userId);
    await userDoc.update({
      status,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Obtenir l'historique des positions d'un driver
   */
  getLocationHistory(
    driverId: string,
    startDate?: Date,
    endDate?: Date
  ): Observable<LocationUpdate[]> {
    let query = this.afs.collection<LocationUpdate>(
      "location_history",
      (ref) => {
        let q = ref
          .where("userId", "==", driverId)
          .orderBy("timestamp", "desc");

        if (startDate) {
          q = q.where("timestamp", ">=", startDate);
        }

        if (endDate) {
          q = q.where("timestamp", "<=", endDate);
        }

        return q.limit(100);
      }
    );

    return query.valueChanges();
  }

  /**
   * Archiver l'historique des positions
   */
  private async archiveLocationHistory(sessionId: string): Promise<void> {
    const historyData = {
      sessionId,
      endTime: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await this.afs.collection("location_history").add(historyData);
  }

  /**
   * Démarrer le tracking de position en temps réel
   */
  private startPositionTracking(): void {
    this.trackingSubscription = this.geolocationService
      .startTracking({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      })
      .subscribe({
        next: (position: GeolocationPosition) => {
          this.updateLocationInFirestore(position);
        },
        error: (error) => {
          console.error("Erreur de géolocalisation:", error);
        },
      });
  }

  /**
   * Mettre à jour la position dans Firestore
   */
  private async updateLocationInFirestore(
    position: GeolocationPosition
  ): Promise<void> {
    const currentUser = await this.authService.currentUser();
    if (!currentUser || !this.currentSessionId) return;

    const locationUpdate: LocationUpdate = {
      userId: currentUser.uid,
      userType: "driver", // À adapter selon le type d'utilisateur
      latitude: position.lat,
      longitude: position.lng,
      accuracy: position.accuracy,
      heading: position.heading || undefined,
      speed: position.speed || undefined,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      status: "online",
      sessionId: this.currentSessionId,
      lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Mettre à jour la position actuelle
    await this.afs
      .collection("locations")
      .doc(currentUser.uid)
      .set(locationUpdate);

    // Ajouter à l'historique si nécessaire
    await this.afs.collection("location_history").add(locationUpdate);
  }

  /**
   * Vérifier les geofences
   */
  private checkGeofences(position: GeolocationPosition): void {
    if (this.geofenceZones.length === 0) return;

    this.geofenceZones.forEach((zone) => {
      const distance =
        this.calculateDistance(
          position.lat,
          position.lng,
          zone.center.lat,
          zone.center.lng
        ) * 1000; // Convert km to meters

      const isInside = distance <= zone.radius;
      const wasInside = this.userInsideZones.has(zone.id);

      if (isInside && !wasInside) {
        // User entered the zone
        this.userInsideZones.add(zone.id);
        this.recordGeofenceEvent(zone.id, "enter", position);
      } else if (!isInside && wasInside) {
        // User exited the zone
        this.userInsideZones.delete(zone.id);
        this.recordGeofenceEvent(zone.id, "exit", position);
      }
    });
  }

  /**
   * Record a geofence event
   */
  private async recordGeofenceEvent(
    zoneId: string,
    eventType: "enter" | "exit",
    position: GeolocationPosition
  ): Promise<void> {
    const currentUser = await this.authService.currentUser();
    if (!currentUser) return;

    const event: GeofenceEvent = {
      userId: currentUser.uid,
      zoneId,
      eventType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      location: {
        latitude: position.lat,
        longitude: position.lng,
      },
    };

    await this.afs.collection("geofence_events").add(event);
  }

  /**
   * Add a geofence zone to monitor
   */
  addGeofenceZone(zone: GeofenceZone): void {
    const existing = this.geofenceZones.findIndex((z) => z.id === zone.id);
    if (existing >= 0) {
      this.geofenceZones[existing] = zone;
    } else {
      this.geofenceZones.push(zone);
    }
  }

  /**
   * Remove a geofence zone
   */
  removeGeofenceZone(zoneId: string): void {
    this.geofenceZones = this.geofenceZones.filter((z) => z.id !== zoneId);
    this.userInsideZones.delete(zoneId);
  }

  /**
   * Clear all geofence zones
   */
  clearGeofenceZones(): void {
    this.geofenceZones = [];
    this.userInsideZones.clear();
  }

  /**
   * Get geofence events for a user
   */
  getGeofenceEvents(userId: string, limit = 50): Observable<GeofenceEvent[]> {
    return this.afs
      .collection<GeofenceEvent>("geofence_events", (ref) =>
        ref
          .where("userId", "==", userId)
          .orderBy("timestamp", "desc")
          .limit(limit)
      )
      .valueChanges();
  }

  /**
   * Générer un ID de session unique
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Obtenir les informations du device
   */
  private getDeviceInfo(): any {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculer la distance entre deux points
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Rayon de la Terre en km
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

  /**
   * Obtenir le statut du tracking
   */
  isTracking(): Observable<boolean> {
    return this.activeTracking$.asObservable();
  }

  /**
   * Obtenir l'ID de session actuel
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Nettoyer les anciennes données
   */
  async cleanupOldData(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Nettoyer l'historique des positions
    const oldLocations = await this.afs
      .collection("location_history", (ref) =>
        ref.where("timestamp", "<", cutoffDate)
      )
      .get()
      .toPromise();

    if (oldLocations) {
      const batch = this.afs.firestore.batch();
      oldLocations.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  }
}
