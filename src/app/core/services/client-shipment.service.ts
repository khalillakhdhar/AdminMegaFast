import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Shipment } from '../models/shipment.model';
import { AuthenticationService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ClientShipmentService {
  constructor(
    private readonly afs: AngularFirestore,
    private readonly authService: AuthenticationService
  ) {}

  /**
   * Get shipments for current client
   */
  getClientShipments(limit: number = 50): Observable<Shipment[]> {
    const clientId = this.authService.getCurrentClientId();

    if (!clientId) {
      throw new Error('Client ID not found');
    }

    return this.afs.collection<Shipment>('shipments', ref =>
      ref.where('clientId', '==', clientId)
         .orderBy('createdAt', 'desc')
         .limit(limit)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as Shipment;
        return { id: a.payload.doc.id, ...data };
      }))
    );
  }

  /**
   * Get a specific shipment by ID (only if it belongs to current client)
   */
  getShipmentById(shipmentId: string): Observable<Shipment | undefined> {
    const clientId = this.authService.getCurrentClientId();

    if (!clientId) {
      throw new Error('Client ID not found');
    }

    return this.afs.collection<Shipment>('shipments').doc(shipmentId)
      .valueChanges({ idField: 'id' }).pipe(
        map(shipment => {
          // Only return shipment if it belongs to current client
          if (shipment && shipment.clientId === clientId) {
            return shipment;
          }
          return undefined;
        })
      );
  }

  /**
   * Create a new shipment for current client
   */
  async createShipment(shipmentData: Partial<Shipment>): Promise<any> {
    const clientId = this.authService.getCurrentClientId();

    if (!clientId) {
      throw new Error('Client ID not found');
    }

    const now = new Date();
    const shipment: Partial<Shipment> = {
      ...shipmentData,
      clientId: clientId,
      status: 'created',
      createdAt: now,
      updatedAt: now,
      history: [{
        at: now,
        status: 'created',
        note: 'Colis créé par le client'
      }]
    };

    // Generate barcode if not provided
    if (!shipment.barcode) {
      shipment.barcode = this.generateBarcode();
    }

    return this.afs.collection('shipments').add(shipment);
  }

  /**
   * Search client's shipments by barcode
   */
  searchByBarcode(barcode: string): Observable<Shipment[]> {
    const clientId = this.authService.getCurrentClientId();

    if (!clientId) {
      throw new Error('Client ID not found');
    }

    return this.afs.collection<Shipment>('shipments', ref =>
      ref.where('clientId', '==', clientId)
         .where('barcode', '==', barcode)
         .limit(1)
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Get client's shipments statistics
   */
  getClientStats(): Observable<any> {
    const clientId = this.authService.getCurrentClientId();

    if (!clientId) {
      throw new Error('Client ID not found');
    }

    return this.afs.collection<Shipment>('shipments', ref =>
      ref.where('clientId', '==', clientId)
    ).valueChanges().pipe(
      map(shipments => {
        const total = shipments.length;
        const statusCounts = shipments.reduce((acc, shipment) => {
          acc[shipment.status] = (acc[shipment.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          total,
          created: statusCounts.created || 0,
          assigned: statusCounts.assigned || 0,
          in_transit: statusCounts.in_transit || 0,
          delivered: statusCounts.delivered || 0,
          returned: statusCounts.returned || 0,
          canceled: statusCounts.canceled || 0
        };
      })
    );
  }

  /**
   * Generate a unique barcode
   */
  private generateBarcode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CLI${timestamp}${random}`.toUpperCase();
  }
}
