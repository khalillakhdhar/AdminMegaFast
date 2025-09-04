import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest, of, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { Shipment, ShipmentStatus } from '../models/shipment.model';
import { Batch } from '../models/batch.model';
import { AuthenticationService } from './auth.service';

export interface DriverStats {
  totalShipments: number;
  deliveredShipments: number;
  inTransitShipments: number;
  returnedShipments: number;
  pendingShipments: number;
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  totalRevenue: number;
  deliveryRate: number;
}

export interface ShipmentFilters {
  status?: ShipmentStatus;
  barcode?: string;
  dateFrom?: Date;
  dateTo?: Date;
  batchId?: string;
  city?: string;
  delegation?: string;
  pickupCity?: string;
  pickupDelegation?: string;
  clientName?: string;
  amountFrom?: number;
  amountTo?: number;
}

export interface CityOption {
  value: string;
  label: string;
  delegation?: string;
}

export interface BatchStatistics {
  totalShipments: number;
  deliveredShipments: number;
  inTransitShipments: number;
  returnedShipments: number;
  pendingShipments: number;
  totalAmount: number;
  deliveredAmount: number;
  deliveryRate: number;
}

export interface DriverDashboardData {
  stats: DriverStats;
  recentShipments: Shipment[];
  activeBatches: Batch[];
  todayDeliveries: Shipment[];
}

@Injectable({
  providedIn: 'root'
})
export class DriverService {

  constructor(
    private readonly afs: AngularFirestore,
    private readonly authService: AuthenticationService
  ) {}

  /**
   * Get current driver ID
   */
  getCurrentDriverId(): string | null {
    if (this.authService.isDriver()) {
      return localStorage.getItem('driverId');
    }
    return null;
  }

  /**
   * Get driver's assigned shipments
   */
  getDriverShipments(status?: string, limit: number = 50): Observable<Shipment[]> {
    const driverId = this.getCurrentDriverId();

    if (!driverId) {
      return of([]);
    }

    return this.afs.collection<Shipment>('shipments', ref => {
      let query = ref.where('assignedTo', '==', driverId);

      if (status) {
        query = query.where('status', '==', status);
      }

      return query.orderBy('createdAt', 'desc').limit(limit);
    }).valueChanges({ idField: 'id' });
  }

  /**
   * Get driver's batches with detailed information
   */
  getDriverBatches(status?: string): Observable<Batch[]> {
    const driverId = this.getCurrentDriverId();

    if (!driverId) {
      return of([]);
    }

    return this.afs.collection<Batch>('batches', ref => {
      let query = ref.where('assignedTo', '==', driverId);

      if (status) {
        query = query.where('status', '==', status);
      }

      return query.orderBy('createdAt', 'desc');
    }).valueChanges({ idField: 'id' }).pipe(
      map(batches => {
        // Enhance batches with shipment details
        return batches.map(batch => ({
          ...batch,
          totalShipments: batch.shipmentIds?.length || 0,
          deliveredShipments: 0, // Will be calculated from actual shipments
          totalAmount: 0 // Will be calculated from actual shipments
        }));
      })
    );
  }

  /**
   * Get batch details with all shipments
   */
  getBatchDetails(batchId: string): Observable<{
    batch: Batch;
    shipments: Shipment[];
    stats: {
      totalShipments: number;
      deliveredShipments: number;
      inTransitShipments: number;
      returnedShipments: number;
      totalAmount: number;
      deliveredAmount: number;
    }
  }> {
    return combineLatest([
      this.afs.doc<Batch>(`batches/${batchId}`).valueChanges({ idField: 'id' }),
      this.afs.collection<Shipment>('shipments', ref =>
        ref.where('batchId', '==', batchId)
      ).valueChanges({ idField: 'id' })
    ]).pipe(
      map(([batch, shipments]) => {
        if (!batch) {
          throw new Error('Batch not found');
        }

        const stats = {
          totalShipments: shipments.length,
          deliveredShipments: shipments.filter(s => s.status === 'delivered').length,
          inTransitShipments: shipments.filter(s => s.status === 'in_transit').length,
          returnedShipments: shipments.filter(s => s.status === 'returned').length,
          totalAmount: shipments.reduce((sum, s) => sum + (s.amount || 0), 0),
          deliveredAmount: shipments
            .filter(s => s.status === 'delivered')
            .reduce((sum, s) => sum + (s.amount || 0), 0)
        };

        return {
          batch,
          shipments,
          stats
        };
      })
    );
  }

  /**
   * Get driver's assigned shipments with comprehensive filtering
   */
  getFilteredShipments(filters: ShipmentFilters = {}): Observable<Shipment[]> {
    const driverId = this.getCurrentDriverId();
    if (!driverId) {
      return of([]);
    }

    return this.afs.collection<Shipment>('shipments', ref => {
      let query: any = ref.where('assignedTo', '==', driverId);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.batchId) {
        query = query.where('batchId', '==', filters.batchId);
      }
      if (filters.city) {
        query = query.where('city', '==', filters.city);
      }
      if (filters.delegation) {
        query = query.where('delegation', '==', filters.delegation);
      }
      if (filters.pickupCity) {
        query = query.where('pickupCity', '==', filters.pickupCity);
      }
      if (filters.pickupDelegation) {
        query = query.where('pickupDelegation', '==', filters.pickupDelegation);
      }

      return query.orderBy('createdAt', 'desc');
    }).valueChanges({ idField: 'id' }).pipe(
      map((shipments: Shipment[]) => {
        let filtered = shipments;

        // Client-side filtering for complex queries
        if (filters.barcode) {
          filtered = filtered.filter(s =>
            s.barcode?.toLowerCase().includes(filters.barcode.toLowerCase())
          );
        }
        if (filters.clientName) {
          filtered = filtered.filter(s =>
            s.clientName?.toLowerCase().includes(filters.clientName.toLowerCase())
          );
        }
        if (filters.dateFrom) {
          filtered = filtered.filter(s => {
            const shipmentDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            return shipmentDate >= filters.dateFrom;
          });
        }
        if (filters.dateTo) {
          filtered = filtered.filter(s => {
            const shipmentDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
            return shipmentDate <= filters.dateTo;
          });
        }
        if (filters.amountFrom) {
          filtered = filtered.filter(s => (s.amount || 0) >= filters.amountFrom);
        }
        if (filters.amountTo) {
          filtered = filtered.filter(s => (s.amount || 0) <= filters.amountTo);
        }        return filtered;
      })
    );
  }

  // Get batch statistics for pie charts
  getBatchStatistics(): Observable<BatchStatistics> {
    return new Observable(observer => {
      const driverId = localStorage.getItem('currentUserId');
      if (!driverId) {
        observer.error('Driver ID not found');
        return;
      }

      // Get all shipments for the driver
      this.getFilteredShipments({}).subscribe({
        next: (shipments) => {
          const totalShipments = shipments.length;
          const deliveredShipments = shipments.filter(s => s.status === 'delivered').length;
          const inTransitShipments = shipments.filter(s =>
            s.status === 'in_transit'
          ).length;
          const returnedShipments = shipments.filter(s => s.status === 'returned').length;
          const pendingShipments = shipments.filter(s => s.status === 'assigned').length;

          const totalAmount = shipments.reduce((sum, s) => sum + (s.amount || 0), 0);
          const deliveredAmount = shipments
            .filter(s => s.status === 'delivered')
            .reduce((sum, s) => sum + (s.amount || 0), 0);

          const statistics: BatchStatistics = {
            totalShipments,
            deliveredShipments,
            inTransitShipments,
            returnedShipments,
            pendingShipments,
            deliveryRate: totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0,
            totalAmount,
            deliveredAmount
          };

          observer.next(statistics);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // Get shipments for a specific batch
  getShipmentsForBatch(batchId: string): Observable<Shipment[]> {
    return this.afs.collection<Shipment>('shipments', ref =>
      ref.where('batchId', '==', batchId)
         .orderBy('createdAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Get available cities for filtering
   */
  getAvailableCities(): Observable<CityOption[]> {
    const driverId = this.getCurrentDriverId();
    if (!driverId) {
      return of([]);
    }

    return this.afs.collection<Shipment>('shipments', ref =>
      ref.where('assignedTo', '==', driverId)
    ).valueChanges().pipe(
      map((shipments: Shipment[]) => {
        const cities = new Set<string>();
        const cityOptions: CityOption[] = [];

        shipments.forEach(shipment => {
          // Destination cities
          if (shipment.city) {
            const delegation = shipment.delegation ? ` (${shipment.delegation})` : '';
            const cityKey = `${shipment.city}${delegation}`;
            if (!cities.has(cityKey)) {
              cities.add(cityKey);
              cityOptions.push({
                value: shipment.city,
                label: cityKey,
                delegation: shipment.delegation
              });
            }
          }

          // Pickup cities
          if (shipment.pickupCity) {
            const delegation = shipment.pickupDelegation ? ` (${shipment.pickupDelegation})` : '';
            const cityKey = `${shipment.pickupCity}${delegation}`;
            if (!cities.has(cityKey)) {
              cities.add(cityKey);
              cityOptions.push({
                value: shipment.pickupCity,
                label: cityKey,
                delegation: shipment.pickupDelegation
              });
            }
          }
        });        return cityOptions.sort((a, b) => a.label.localeCompare(b.label));
      })
    );
  }

  /**
   * Get driver statistics
   */
  getDriverStats(): Observable<DriverStats> {
    const driverId = this.getCurrentDriverId();

    if (!driverId) {
      return of({
        totalShipments: 0,
        deliveredShipments: 0,
        inTransitShipments: 0,
        returnedShipments: 0,
        pendingShipments: 0,
        totalBatches: 0,
        activeBatches: 0,
        completedBatches: 0,
        totalRevenue: 0,
        deliveryRate: 0
      });
    }

    return combineLatest([
      this.getDriverShipments(),
      this.getDriverBatches()
    ]).pipe(
      map(([shipments, batches]) => {
        const totalShipments = shipments.length;
        const deliveredShipments = shipments.filter(s => s.status === 'delivered').length;
        const inTransitShipments = shipments.filter(s => s.status === 'in_transit').length;
        const returnedShipments = shipments.filter(s => s.status === 'returned').length;
        const pendingShipments = shipments.filter(s => ['assigned', 'picked_up'].includes(s.status)).length;

        const totalBatches = batches.length;
        const activeBatches = batches.filter(b => ['active', 'in_progress'].includes(b.status || '')).length;
        const completedBatches = batches.filter(b => b.status === 'completed').length;

        const totalRevenue = shipments
          .filter(s => s.status === 'delivered')
          .reduce((sum, s) => sum + (s.amount || 0), 0);

        const deliveryRate = totalShipments > 0 ? (deliveredShipments / totalShipments) * 100 : 0;

        return {
          totalShipments,
          deliveredShipments,
          inTransitShipments,
          returnedShipments,
          pendingShipments,
          totalBatches,
          activeBatches,
          completedBatches,
          totalRevenue,
          deliveryRate: Math.round(deliveryRate * 100) / 100
        };
      })
    );
  }

  /**
   * Get complete dashboard data
   */
  getDashboardData(): Observable<DriverDashboardData> {
    const driverId = this.getCurrentDriverId();

    if (!driverId) {
      return of({
        stats: {
          totalShipments: 0,
          deliveredShipments: 0,
          inTransitShipments: 0,
          returnedShipments: 0,
          pendingShipments: 0,
          totalBatches: 0,
          activeBatches: 0,
          completedBatches: 0,
          totalRevenue: 0,
          deliveryRate: 0
        },
        recentShipments: [],
        activeBatches: [],
        todayDeliveries: []
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return combineLatest([
      this.getDriverStats(),
      this.getDriverShipments(undefined, 10), // Recent shipments
      this.getDriverBatches('active'), // Active batches
      this.getTodayDeliveries()
    ]).pipe(
      map(([stats, recentShipments, activeBatches, todayDeliveries]) => ({
        stats,
        recentShipments,
        activeBatches,
        todayDeliveries
      }))
    );
  }

  /**
   * Get today's deliveries
   */
  getTodayDeliveries(): Observable<Shipment[]> {
    const driverId = this.getCurrentDriverId();

    if (!driverId) {
      return of([]);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.afs.collection<Shipment>('shipments', ref =>
      ref.where('assignedTo', '==', driverId)
         .where('deliveredAt', '>=', today)
         .where('deliveredAt', '<', tomorrow)
         .orderBy('deliveredAt', 'desc')
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Update shipment status
   */
  async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    driverNotes?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status: status,
        lastUpdated: new Date(),
        lastUpdatedBy: this.getCurrentDriverId()
      };

      if (driverNotes) {
        updateData.driverNotes = driverNotes;
      }

      await this.afs.collection('shipments').doc(shipmentId).update(updateData);
    } catch (error) {
      console.error('Error updating shipment status:', error);
      throw error;
    }
  }

  /**
   * Start batch delivery
   */
  async startBatchDelivery(batchId: string): Promise<void> {
    const driverId = this.getCurrentDriverId();

    if (!driverId) {
      throw new Error('Driver ID not found');
    }

    const now = new Date();

    // Update batch status
    await this.afs.collection('batches').doc(batchId).update({
      status: 'in_progress',
      startedAt: now,
      updatedAt: now
    });

    // Update all shipments in batch to in_transit
    const shipments = await firstValueFrom(this.afs.collection('shipments', ref =>
      ref.where('batchId', '==', batchId)
         .where('assignedTo', '==', driverId)
    ).get());

    const batch = this.afs.firestore.batch();

    shipments?.forEach(doc => {
      const shipmentRef = this.afs.collection('shipments').doc(doc.id).ref;
      const currentData = doc.data() as Shipment;
      const history = currentData.history || [];

      history.push({
        at: now,
        status: 'in_transit',
        note: 'Livraison du lot commencée',
        by: driverId
      });

      batch.update(shipmentRef, {
        status: 'in_transit',
        inTransitAt: now,
        updatedAt: now,
        history: history
      });
    });

    await batch.commit();
  }

  /**
   * Complete batch delivery
   */
  async completeBatchDelivery(batchId: string): Promise<void> {
    const driverId = this.getCurrentDriverId();

    if (!driverId) {
      throw new Error('Driver ID not found');
    }

    const now = new Date();

    // Check if all shipments in batch are delivered or returned
    const shipments = await firstValueFrom(this.afs.collection('shipments', ref =>
      ref.where('batchId', '==', batchId)
         .where('assignedTo', '==', driverId)
    ).get());

    const allCompleted = shipments?.docs.every(doc => {
      const data = doc.data() as Shipment;
      return ['delivered', 'returned'].includes(data.status);
    });

    if (!allCompleted) {
      throw new Error('Tous les colis du lot doivent être livrés ou retournés');
    }

    // Update batch status
    await this.afs.collection('batches').doc(batchId).update({
      status: 'completed',
      completedAt: now,
      updatedAt: now
    });
  }

  /**
   * Search shipments by barcode
   */
  searchShipmentByBarcode(barcode: string): Observable<Shipment | null> {
    const driverId = this.getCurrentDriverId();

    if (!driverId) {
      return of(null);
    }

    return this.afs.collection<Shipment>('shipments', ref =>
      ref.where('barcode', '==', barcode)
         .where('assignedTo', '==', driverId)
         .limit(1)
    ).valueChanges({ idField: 'id' }).pipe(
      map(shipments => shipments.length > 0 ? shipments[0] : null)
    );
  }
}
