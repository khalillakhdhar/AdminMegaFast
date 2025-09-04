import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Shipment, ShipmentHistoryEntry, ShipmentStatus } from '../models/shipment.model';
import { map } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';

export interface ShipmentListFilters {
  barcode?: string;
  clientPhone?: string;
  status?: ShipmentStatus;
  assignedTo?: string;
  batchId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;               // ex: 20
  orderBy?: 'createdAt' | 'updatedAt';
  orderDir?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class ShipmentService {
  private readonly colName = 'shipments';
  private readonly col = this.afs.collection<Shipment>(this.colName);

  constructor(private readonly afs: AngularFirestore) {}

  // ---- Helpers mapping
  private mapSnapshot(actions: any[]) {
    return actions.map(a => {
      const data = a.payload.doc.data() as Shipment;
      data.id = a.payload.doc.id;
      return data;
    });
  }

  // ---- CRUD
  getById(id: string): Observable<Shipment | undefined> {
    return this.col.doc(id).valueChanges({ idField: 'id' });
  }

  create(sh: Shipment) {
    const now = new Date();
    sh.createdAt = now;
    sh.updatedAt = now;
    sh.status = sh.status || 'created';
    sh.history = (sh.history || []).concat([{ at: now, status: sh.status }]);
    return this.col.add(sh);
  }

  update(id: string, patch: Partial<Shipment>) {
    patch.updatedAt = new Date();
    return this.col.doc(id).update(patch);
  }

  delete(id: string) {
    return this.col.doc(id).delete();
  }

  // ---- Liste (Observable) avec filtres courants
  list(filters: ShipmentListFilters = {}): Observable<Shipment[]> {
    return this.afs.collection<Shipment>(this.colName, ref => {
      let q: firebase.default.firestore.Query = ref as any;

      if (filters.status)      q = q.where('status', '==', filters.status);
      if (filters.assignedTo)  q = q.where('assignedTo', '==', filters.assignedTo);
      if (filters.batchId)     q = q.where('batchId', '==', filters.batchId);
      if (filters.barcode)     q = q.where('barcode', '==', filters.barcode);
      if (filters.clientPhone) q = q.where('clientPhone', '==', filters.clientPhone);

      // Apply orderBy only when explicitly requested, or when date range filters are used
      // to avoid requiring a composite index for common equality filters like batchId.
      let orderByField: 'createdAt' | 'updatedAt' | undefined = undefined;
      if (filters.orderBy) {
        orderByField = filters.orderBy;
      } else if (filters.dateFrom || filters.dateTo) {
        orderByField = 'createdAt';
      }

      if (orderByField) {
        const dir = filters.orderDir || 'desc';
        q = q.orderBy(orderByField, dir);
      }

      if (orderByField) {
        if (filters.dateFrom) q = q.where(orderByField, '>=', filters.dateFrom);
        if (filters.dateTo)   q = q.where(orderByField, '<=', filters.dateTo);
      }

      if (filters.limit)    q = q.limit(filters.limit);

      return q;
    })
    .snapshotChanges()
    .pipe(map(actions => this.mapSnapshot(actions)));
  }

  // ---- Get many by IDs (Observable, realtime)
  getManyByIds(ids: string[]): Observable<Shipment[]> {
    const unique = Array.from(new Set((ids || []).filter(Boolean)));
    if (unique.length === 0) return of([]);

    const streams = unique.map(id => this.col.doc<Shipment>(id).valueChanges({ idField: 'id' }));
    return combineLatest(streams).pipe(
      map(list => list.filter((s): s is Shipment => !!s && typeof (s as any).id === 'string')),
      // Preserve the order of ids provided
      map(list => {
        const order = new Map(unique.map((id, i) => [id, i]));
        return list.sort((a, b) => (order.get(a.id || '') ?? 0) - (order.get(b.id || '') ?? 0));
      })
    );
  }

  /**
   * Pagination manuelle (côté TS) – retourne { items, lastDoc } pour page suivante avec startAfter
   * Exemple usage:
   *   const {items, lastDoc} = await shipmentService.listPaged({limit:20});
   *   const next = await shipmentService.listPaged({limit:20}, lastDoc);
   */
  async listPaged(filters: ShipmentListFilters = {}, startAfterDoc?: any) {
    let q = this.afs.collection<Shipment>(this.colName).ref as firebase.default.firestore.Query;

    if (filters.status)      q = q.where('status', '==', filters.status);
    if (filters.assignedTo)  q = q.where('assignedTo', '==', filters.assignedTo);
    if (filters.batchId)     q = q.where('batchId', '==', filters.batchId);
    if (filters.barcode)     q = q.where('barcode', '==', filters.barcode);
    if (filters.clientPhone) q = q.where('clientPhone', '==', filters.clientPhone);

    const orderBy = filters.orderBy || 'createdAt';
    const dir = filters.orderDir || 'desc';
    q = q.orderBy(orderBy, dir);

    if (filters.dateFrom) q = q.where(orderBy, '>=', filters.dateFrom);
    if (filters.dateTo)   q = q.where(orderBy, '<=', filters.dateTo);

    if (startAfterDoc) q = q.startAfter(startAfterDoc);
    if (filters.limit) q = q.limit(filters.limit);

    const snap = await q.get();
    const items: Shipment[] = [];
    snap.forEach(d => items.push({ id: d.id, ...(d.data() as Shipment) }));
    const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { items, lastDoc };
  }

  // ---- Actions métier
  async setStatus(id: string, status: ShipmentStatus, opts?: { by?: string; note?: string }) {
    const ref = this.col.doc(id).ref;
    const now = new Date();

    await this.afs.firestore.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Colis introuvable');

      const current = snap.data();
      const history = (current.history || []).slice(-30); // garde les 30 derniers
      const entry: ShipmentHistoryEntry = { 
        at: now, 
        status 
      };
      
      // Only add optional fields if they have truthy values
      if (opts?.by?.trim()) {
        entry.by = opts.by.trim();
      }
      if (opts?.note?.trim()) {
        entry.note = opts.note.trim();
      }
      
      history.push(entry);

      // Build update object without undefined values
      const updateData: any = { 
        status, 
        updatedAt: now, 
        history 
      };

      tx.update(ref, updateData);
    });
  }

  assignToDriver(id: string, driverId: string) {
    return this.update(id, { assignedTo: driverId, status: 'assigned' });
  }

  async assignToBatch(id: string, batchId: string) {
    const ref = this.col.doc(id).ref;
    const now = new Date();
    await this.afs.firestore.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Colis introuvable');

      const current = snap.data();
      const history = (current.history || []).slice(-30);
      history.push({ at: now, status: current.status, note: `Affecté au lot ${batchId}` });

      tx.update(ref, { batchId, updatedAt: now, history });
    });
  }

  async unassignFromBatch(id: string) {
    const ref = this.col.doc(id).ref;
    const now = new Date();
    await this.afs.firestore.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Colis introuvable');
      const current = snap.data();
      const history = (current.history || []).slice(-30);
      history.push({ at: now, status: current.status, note: 'Retiré du lot' });
      tx.update(ref, { batchId: null, updatedAt: now, history });
    });
  }

  /**
   * Affectation en masse à un lot (chunk 500 écritures)
   */
  async bulkAssignToBatch(shipmentIds: string[], batchId: string) {
    const chunks: string[][] = [];
    for (let i = 0; i < shipmentIds.length; i += 450) chunks.push(shipmentIds.slice(i, i + 450));

    const now = new Date();
    for (const c of chunks) {
      const wb = this.afs.firestore.batch();
      for (const id of c) {
        const ref = this.col.doc(id).ref;
        wb.update(ref, { batchId, updatedAt: now });
      }
      await wb.commit();
    }
  }

  // ---- Récents (pour dashboard)
  recent(limit = 5) {
    return this.afs.collection<Shipment>(this.colName, ref =>
      ref.orderBy('createdAt', 'desc').limit(limit)
    ).snapshotChanges().pipe(map(actions => this.mapSnapshot(actions)));
  }
}
