export interface LeaveRequest {
  id?: string;
  employeeId: string;           // uid employé
  categoryId: string;
  startDate: any;               // Date ou Timestamp
  endDate: any;
  status: 'pending' | 'approved' | 'rejected' | 'taken';
  requestedAt: any;
  approvedBy?: string;
  approvedAt?: any;
  comment?: string;
  requestedDays?: number;       // jours ouvrables demandés (calculés)
}
