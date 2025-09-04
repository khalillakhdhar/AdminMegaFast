export interface LeaveCategory {
  id?: string;
  name: string;                 // "Annuel", "Maladie", "Exceptionnel", etc.
  annualDays?: number | null;   // null => non plafonné par défaut
  description?: string;
  paid?: boolean;               // congé payé (true) / non-payé (false)
}
