import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LeaveCategory } from '../models/leave-category.model';
import { LeaveRequest } from '../models/leave-request.model';
import { LeaveBalance } from '../models/leave-balance.model';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  constructor(private readonly afs: AngularFirestore) {}

  // ---------- Catégories ----------
  getCategories() {
    return this.afs.collection<LeaveCategory>('leaveCategories')
      .snapshotChanges()
      .pipe(map(actions => actions.map(a => {
        const data = a.payload.doc.data();
        data.id = a.payload.doc.id;
        return data;
      })));
  }
  createCategory(cat: LeaveCategory) {
    return this.afs.collection('leaveCategories').add(cat);
  }
  updateCategory(id: string, data: Partial<LeaveCategory>) {
    return this.afs.collection('leaveCategories').doc(id).update(data);
  }
  deleteCategory(id: string) {
    return this.afs.collection('leaveCategories').doc(id).delete();
  }

  // ---------- Demandes ----------
  requestLeave(req: LeaveRequest, publicHolidays: Date[] = []) {
    const days = this.businessDaysBetween(new Date(req.startDate), new Date(req.endDate), publicHolidays);
    req.requestedDays = days;
    req.requestedAt = new Date();
    req.status = 'pending';
    return this.afs.collection('leaveRequests').add(req);
  }

  updateLeaveRequest(id: string, data: Partial<LeaveRequest>) {
    return this.afs.collection('leaveRequests').doc(id).update(data);
  }

  getLeaveRequests(filters?: {employeeId?: string, status?: string}) {
    let ref: any = this.afs.collection<LeaveRequest>('leaveRequests').ref;
    if (filters?.employeeId) ref = ref.where('employeeId', '==', filters.employeeId);
    if (filters?.status) ref = ref.where('status', '==', filters.status);
    return this.afs.collection('leaveRequests', () => ref)
      .snapshotChanges().pipe(map(actions => actions.map(a => {
        const data = a.payload.doc.data() as LeaveRequest;
        data.id = a.payload.doc.id;
        return data;
      })));
  }

  // ---------- Workflow: APPROUVER (transaction) ----------
  /**
   * Approve avec déduction atomique du solde via transaction:
   * - ID de solde déterministe: `${employeeId}_${categoryId}_${year}`
   * - recalcul des jours ouvrables
   * - vérification du solde
   */
  async approveLeave(requestId: string, approverId: string, entryDate: Date, publicHolidays: Date[] = []) {
    const firestore = this.afs.firestore;
    await firestore.runTransaction(async (tx) => {
      const reqRef = this.afs.collection('leaveRequests').doc(requestId).ref;
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) throw new Error('Demande introuvable');
      const req = reqSnap.data() as LeaveRequest;
      if (req.status !== 'pending') throw new Error('La demande n’est pas en attente');

      const days = this.businessDaysBetween(new Date(req.startDate), new Date(req.endDate), publicHolidays);
      const year = new Date(req.startDate).getFullYear();
      const balanceId = `${req.employeeId}_${req.categoryId}_${year}`;
      const balRef = this.afs.collection('leaveBalances').doc(balanceId).ref;

      // Crée/MAJ l'allocation si manquante
      const allocation = await this.calculateAnnualLeaveAllocation(entryDate, year);
      const balSnap = await tx.get(balRef);
      if (!balSnap.exists) {
        const newBal: LeaveBalance = {
          id: balanceId,
          employeeId: req.employeeId,
          categoryId: req.categoryId,
          year,
          allocated: allocation,
          used: 0,
          carriedOver: 0
        };
        tx.set(balRef, newBal, { merge: true });
      } else {
        // Harmonise l'allocation si elle a changé
        const bal = balSnap.data() as LeaveBalance;
        if (bal.allocated !== allocation) {
          tx.update(balRef, { allocated: allocation });
        }
      }

      // Rechage après éventuel set/maj
      const balSnap2 = await tx.get(balRef);
      const bal2 = balSnap2.data() as LeaveBalance;
      const available = (bal2.allocated + (bal2.carriedOver || 0)) - (bal2.used || 0);
      if (available < days) throw new Error('Solde insuffisant');

      tx.update(balRef, { used: (bal2.used || 0) + days });
      tx.update(reqRef, {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        requestedDays: days
      });
    });
    return { ok: true };
  }

  // ---------- Workflow: REJETER ----------
  async rejectLeave(requestId: string, approverId: string, comment?: string) {
    const reqRef = this.afs.collection('leaveRequests').doc(requestId).ref;
    await this.afs.firestore.runTransaction(async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) throw new Error('Demande introuvable');
      const req = reqSnap.data() as LeaveRequest;
      if (req.status !== 'pending') throw new Error('La demande n’est pas en attente');
      tx.update(reqRef, {
        status: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
        comment: comment || null
      });
    });
  }

  // ---------- Allocations annuelles (Tunisie simplifiée)
  // 1 jour/mois (max 12) +1 jour/5 ans d’ancienneté, plafonné à 18 jours.
  async calculateAnnualLeaveAllocation(entryDate: Date, year: number): Promise<number> {
    const monthsWorked = this.monthsInYearWorked(entryDate, year);
    let baseDays = Math.min(monthsWorked, 12);
    const years = this.getYearsOfService(entryDate, year);
    const extra = Math.floor(years / 5);
    return Math.min(baseDays + extra, 18);
  }

  private monthsInYearWorked(entryDate: Date, year: number): number {
    const start = new Date(year, 0, 1);
    const end   = new Date(year, 11, 31);
    const actualStart = entryDate > start ? entryDate : start;
    const months = (end.getFullYear() - actualStart.getFullYear()) * 12 +
                   (end.getMonth() - actualStart.getMonth()) + 1;
    return Math.max(0, Math.min(months, 12));
  }

  private getYearsOfService(entryDate: Date, year: number): number {
    const endOfYear = new Date(year, 11, 31);
    let years = endOfYear.getFullYear() - entryDate.getFullYear();
    const mDiff = endOfYear.getMonth() - entryDate.getMonth();
    if (mDiff < 0 || (mDiff === 0 && endOfYear.getDate() < entryDate.getDate())) years--;
    return years;
  }

  // ---------- Seed allocations pour tous les employés ----------
  async seedAnnualAllocationsForAllEmployees(
    employees: { id: string; entryDate: Date }[],
    year: number,
    categoryId: string
  ) {
    for (const e of employees) {
      const balanceId = `${e.id}_${categoryId}_${year}`;
      const allocated = await this.calculateAnnualLeaveAllocation(e.entryDate, year);
      const balRef = this.afs.collection('leaveBalances').doc(balanceId).ref;
      await balRef.set({
        id: balanceId,
        employeeId: e.id,
        categoryId,
        year,
        allocated,
        used: 0,
        carriedOver: 0
      }, { merge: true });
    }
  }

  // ---------- Jours ouvrables ----------
  businessDaysBetween(start: Date, end: Date, publicHolidays: Date[] = []): number {
    if (end < start) return 0;
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const holidays = publicHolidays.map(d => new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    let days = 0;
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (d <= endDate) {
      const day = d.getDay(); // 0=Dim, 6=Sam
      const weekend = (day === 0 || day === 6);
      const isHoliday = holidays.some(h => isSameDay(h, d));
      if (!weekend && !isHoliday) days++;
      d.setDate(d.getDate() + 1);
    }
    return days;
  }
}
