import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private readonly afs: AngularFirestore) {}

  // Ex: stats colis par mois (année)
  async shipmentsByMonth(year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);

    const qs = await this.afs.collection('shipments', ref =>
      ref.where('updatedAt', '>=', start)
         .where('updatedAt', '<=', end)
    ).ref.get();

    const buckets: Record<string, { total: number; delivered: number; cod: number }> = {};
    for (let m = 0; m < 12; m++) buckets[String(m+1).padStart(2,'0')] = { total: 0, delivered: 0, cod: 0 };

    qs.forEach(doc => {
      const s: any = doc.data();
      const d = new Date(s.updatedAt?.toDate?.() || s.updatedAt);
      const key = String(d.getMonth() + 1).padStart(2,'0');
      buckets[key].total++;
      if (s.status === 'delivered' || s.status === 'livre') {
        buckets[key].delivered++;
        buckets[key].cod += s.amount || 0;
      }
    });

    return buckets;
  }
}
