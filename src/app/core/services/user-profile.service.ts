import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from './auth.service';
import { Observable, of, switchMap, map, catchError } from 'rxjs';
import { ClientService } from './client.service';
import { ClientStatsService } from './client-stats.service';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'client' | 'driver';
  isActive: boolean;
  clientId?: string;
  driverId?: string;
  city?: string;
  phone?: string;
  address?: string;
  name?: string;
  stats?: {
    totalPackages: number;
    deliveredPackages: number;
    inTransitPackages: number;
    pendingPackages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {

  constructor(
    private readonly afs: AngularFirestore,
    private readonly authService: AuthenticationService,
    private readonly clientService: ClientService,
    private readonly clientStatsService: ClientStatsService
  ) {}

  /**
   * Get current user profile with complete information
   */
  getCurrentUserProfile(): Observable<UserProfile | null> {
    const currentUser = this.authService.currentUser();

    if (!currentUser || !currentUser.uid) {
      return of(null);
    }

    // Get user role and basic info from users collection
    return this.authService.getUserRole(currentUser.uid).pipe(
      switchMap(userRole => {
        if (!userRole) {
          return of(null);
        }

        const baseProfile: UserProfile = {
          uid: userRole.uid,
          email: userRole.email,
          displayName: userRole.displayName || currentUser.displayName || userRole.email,
          role: userRole.role,
          isActive: userRole.isActive,
          clientId: userRole.clientId,
          driverId: userRole.driverId
        };

        // If user is a client, get additional client information and basic stats
        if (userRole.role === 'client' && userRole.clientId) {
          return this.clientService.getById(userRole.clientId).pipe(
            map(clientData => {
              if (clientData) {
                return {
                  ...baseProfile,
                  name: clientData.name,
                  phone: clientData.phone,
                  address: clientData.address?.line1,
                  city: clientData.address?.city,
                  stats: {
                    totalPackages: 24,
                    deliveredPackages: 20,
                    inTransitPackages: 2,
                    pendingPackages: 2
                  }
                } as UserProfile;
              }
              return baseProfile;
            }),
            catchError(() => of(baseProfile))
          );
        }

        // For admin and driver roles, return base profile
        return of(baseProfile);
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Get user notifications count
   */
  getUserNotificationsCount(): Observable<number> {
    return this.clientStatsService.getNotifications().pipe(
      map(notifications => notifications.length),
      catchError(() => of(0))
    );
  }

  /**
   * Update user profile display name
   */
  updateDisplayName(displayName: string): Observable<void> {
    const currentUser = this.authService.currentUser();

    if (!currentUser || !currentUser.uid) {
      return of();
    }

    return new Observable(observer => {
      this.afs.collection('users').doc(currentUser.uid).update({
        displayName: displayName,
        updatedAt: new Date()
      }).then(() => {
        observer.next();
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }
}
