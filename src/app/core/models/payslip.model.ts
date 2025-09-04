export interface PayslipItem {
  label: string;
  amount: number;
  taxable?: boolean;        // par défaut true
  cnssApplicable?: boolean; // par défaut true
}

export interface Payslip {
  id?: string;
  employeeId: string;
  month: number;
  year: number;

  baseSalary: number;
  allowances: PayslipItem[];   // primes/indemnités
  overtime: PayslipItem[];     // HS en dinars (valorisées)
  deductions: PayslipItem[];   // retenues

  gross: number;               // brut total
  cnssBase: number;            // base CNSS (items applicables)
  employeeCnss: number;        // 9.18%
  employerCnss: number;        // 16.57%
  taxableBase: number;         // base IRPP (taxables - employeeCnss)
  incomeTax: number;           // IRPP
  net: number;                 // net à payer
  employerCost: number;        // coût employeur (brut + patronales)

  pdfUrl?: string;             // si stocké en Storage
  details?: any;               // JSON libre
  createdAt?: any;
}
