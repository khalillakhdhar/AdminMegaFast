import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthenticationService } from './auth.service';
import { Observable, of, combineLatest, map } from 'rxjs';

export interface ClientStats {
  totalPackages: number;
  deliveredPackages: number;
  inTransitPackages: number;
  pendingPackages: number;
  cancelledPackages: number;
  totalRevenue: number;
  recentActivities: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ClientStatsService {

  constructor(
    private readonly afs: AngularFirestore,
    private readonly authService: AuthenticationService
  ) {}

  /**
   * Get real-time client statistics from Firebase
   */
  getClientStats(): Observable<ClientStats> {
    const clientId = this.authService.getCurrentClientId();

    if (!clientId) {
      return of({
        totalPackages: 0,
        deliveredPackages: 0,
        inTransitPackages: 0,
        pendingPackages: 0,
        cancelledPackages: 0,
        totalRevenue: 0,
        recentActivities: []
      });
    }

    // Query shipments for this client
    const shipmentsQuery = this.afs.collection('shipments', ref =>
      ref.where('clientId', '==', clientId)
    );

    return shipmentsQuery.valueChanges().pipe(
      map((shipments: any[]) => {
        const stats = {
          totalPackages: shipments.length,
          deliveredPackages: shipments.filter(s => s.status === 'delivered').length,
          inTransitPackages: shipments.filter(s => s.status === 'in-transit').length,
          pendingPackages: shipments.filter(s => s.status === 'pending').length,
          cancelledPackages: shipments.filter(s => s.status === 'cancelled').length,
          totalRevenue: shipments.reduce((sum, s) => sum + (s.totalCost || 0), 0),
          recentActivities: shipments
            .sort((a, b) => (b.createdAt?.toDate?.() || new Date(b.createdAt)) - (a.createdAt?.toDate?.() || new Date(a.createdAt)))
            .slice(0, 5)
        };

        return stats;
      })
    );
  }

  /**
   * Get quick dashboard stats for topbar display
   */
  getQuickStats(): Observable<{totalPackages: number, deliveredPackages: number, inTransitPackages: number, pendingPackages: number}> {
    return this.getClientStats().pipe(
      map(stats => ({
        totalPackages: stats.totalPackages,
        deliveredPackages: stats.deliveredPackages,
        inTransitPackages: stats.inTransitPackages,
        pendingPackages: stats.pendingPackages
      }))
    );
  }

  /**
   * Get recent shipment activities
   */
  getRecentActivities(): Observable<any[]> {
    const clientId = this.authService.getCurrentClientId();

    if (!clientId) {
      return of([]);
    }

    return this.afs.collection('shipments', ref =>
      ref.where('clientId', '==', clientId)
         .orderBy('createdAt', 'desc')
         .limit(10)
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Get notifications for current client
   */
  getNotifications(): Observable<any[]> {
    const currentUser = this.authService.currentUser();

    if (!currentUser?.uid) {
      return of([]);
    }

    // Query notifications for this user
    return this.afs.collection('notifications', ref =>
      ref.where('userId', '==', currentUser.uid)
         .where('isRead', '==', false)
         .orderBy('createdAt', 'desc')
         .limit(10)
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): Promise<void> {
    return this.afs.collection('notifications').doc(notificationId).update({
      isRead: true,
      readAt: new Date()
    });
  }
}
