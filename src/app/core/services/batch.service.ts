import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Batch } from '../models/batch.model';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly col = this.afs.collection<Batch>('batches');

  constructor(private readonly afs: AngularFirestore) {}

  getAll() {
    return this.col.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        data.id = a.payload.doc.id;
        return data;
      }))
    );
  }

// batch.service.ts
getById(id: string) {
  return this.col.doc(id).valueChanges({ idField: 'id' });
}


  create(batch: Batch) {
    batch.createdAt = new Date();
    return this.col.add(batch);
  }

  update(id: string, data: Partial<Batch>) {
    return this.col.doc(id).update(data);
  }

  delete(id: string) {
    return this.col.doc(id).delete();
  }

  /**
   * Recalcule et met à jour:
   * - totalAmount (COD livré)
   * - totalShipments
   * - deliveredShipments
   */
  async recomputeStats(batchId: string) {
    // Calcule à partir des colis ayant batchId == batchId (pas besoin de shipmentIds sur le lot)
    const qs = await this.afs.collection('shipments').ref
      .where('batchId', '==', batchId)
      .get();

    let totalAmount = 0, totalShipments = 0, deliveredShipments = 0;
    qs.forEach(snap => {
      const s: any = snap.data();
      totalShipments++;
      if (s.status === 'delivered' || s.status === 'livre') {
        deliveredShipments++;
        totalAmount += s.amount || 0;
      }
    });

    await this.col.doc(batchId).update({ totalAmount, totalShipments, deliveredShipments });
    return { totalAmount, totalShipments, deliveredShipments };
  }
}
