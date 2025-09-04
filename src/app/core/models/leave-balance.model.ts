export interface LeaveBalance {
  id?: string;                  // DOIT ÊTRE: `${employeeId}_${categoryId}_${year}`
  employeeId: string;
  categoryId: string;
  year: number;
  allocated: number;            // jours alloués
  used: number;                 // jours consommés
  carriedOver?: number;         // reliquat reporté
}
