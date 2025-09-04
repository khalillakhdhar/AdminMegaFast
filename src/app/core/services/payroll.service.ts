import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Payslip, PayslipItem } from '../models/payslip.model';

(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

@Injectable({ providedIn: 'root' })
export class PayrollService {
  // Taux usités en Tunisie (à ajuster si barèmes changent)
  private readonly EMPLOYEE_CNSS = 0.0918; // 9.18% salarié
  private readonly EMPLOYER_CNSS = 0.1657; // 16.57% employeur

  constructor(private readonly afs: AngularFirestore) {}

  // Génère/enregistre une fiche de paie
  async generatePayslip(data: {
    employeeId: string;
    baseSalary: number;
    month: number;
    year: number;
    allowances?: PayslipItem[];
    overtime?: PayslipItem[];
    deductions?: PayslipItem[];
  }): Promise<Payslip> {
    const allowances = (data.allowances || []).map(this.fillDefaults);
    const overtime   = (data.overtime   || []).map(this.fillDefaults);
    const deductions = (data.deductions || []).map(this.fillDefaults);

    const gross = this.computeGrossSalary(data.baseSalary, allowances, overtime, deductions);
    const cnssBase = this.computeCnssBase(data.baseSalary, allowances, overtime);
    const employeeCnss = this.roundCurrency(cnssBase * this.EMPLOYEE_CNSS);
    const employerCnss = this.roundCurrency(cnssBase * this.EMPLOYER_CNSS);

    const taxableBase = this.computeTaxableBase(data.baseSalary, allowances, overtime) - employeeCnss;
    const incomeTax = this.roundCurrency(this.calculateIncomeTaxMonthly(taxableBase));

    const net = this.roundCurrency(gross - employeeCnss - incomeTax);
    const employerCost = this.roundCurrency(gross + employerCnss);

    const payslip: Payslip = {
      employeeId: data.employeeId,
      month: data.month,
      year: data.year,
      baseSalary: data.baseSalary,
      allowances, overtime, deductions,
      gross, cnssBase, employeeCnss, employerCnss,
      taxableBase, incomeTax, net, employerCost,
      createdAt: new Date()
    };

    const ref = await this.afs.collection('payslips').add(payslip);
    payslip.id = ref.id;
    return payslip;
  }

  // Stats paie simples
  async getMonthlyTotals(employeeId: string, year: number, month: number) {
    const qs = await this.afs.collection<Payslip>('payslips', ref =>
      ref.where('employeeId', '==', employeeId)
         .where('year', '==', year)
         .where('month', '==', month)
    ).ref.get();

    let gross = 0, net = 0, empCnss = 0, erCnss = 0, tax = 0, employerCost = 0;
    qs.forEach(s => {
      const p = s.data();
      gross += p.gross;
      net += p.net;
      empCnss += p.employeeCnss;
      erCnss += p.employerCnss;
      tax += p.incomeTax;
      employerCost += p.employerCost;
    });
    return { gross, net, employeeCnss: empCnss, employerCnss: erCnss, incomeTax: tax, employerCost };
  }

  // PDF
  async getPayslipPdfBlob(p: Payslip): Promise<Blob> {
    const docDef = this.buildPdfDefinition(p);
    return new Promise<Blob>((resolve) => {
      pdfMake.createPdf(docDef).getBlob(blob => resolve(blob));
    });
  }

  downloadPayslipPdf(p: Payslip) {
    const docDef = this.buildPdfDefinition(p);
    pdfMake.createPdf(docDef).download(`payslip_${p.employeeId}_${p.year}-${String(p.month).padStart(2,'0')}.pdf`);
  }

  // Helpers de calcul
  private fillDefaults(it: PayslipItem): PayslipItem {
    return {
      taxable: it.taxable !== false,
      cnssApplicable: it.cnssApplicable !== false,
      ...it
    };
  }

  private computeGrossSalary(base: number, allowances: PayslipItem[], overtime: PayslipItem[], deductions: PayslipItem[]): number {
    let total = base;
    allowances.forEach(a => total += a.amount);
    overtime.forEach(o => total += o.amount);
    deductions.forEach(d => total -= d.amount);
    return this.roundCurrency(total);
  }

  private computeCnssBase(base: number, allowances: PayslipItem[], overtime: PayslipItem[]): number {
    let cnssBase = base;
    allowances.filter(a => a.cnssApplicable).forEach(a => cnssBase += a.amount);
    overtime.filter(o => o.cnssApplicable).forEach(o => cnssBase += o.amount);
    return this.roundCurrency(cnssBase);
  }

  private computeTaxableBase(base: number, allowances: PayslipItem[], overtime: PayslipItem[]): number {
    let taxable = base;
    allowances.filter(a => a.taxable).forEach(a => taxable += a.amount);
    overtime.filter(o => o.taxable).forEach(o => taxable += o.amount);
    return this.roundCurrency(taxable);
  }

  /**
   * Barème IRPP mensuel (progressif – adapte si nécessaire).
   * 0% jusqu’à 5k/an, 26% jusqu’à 20k/an, 28% jusqu’à 30k/an, 32% jusqu’à 50k/an, 35% au-delà.
   * Converti en base mensuelle.
   */
  private calculateIncomeTaxMonthly(monthlyTaxable: number): number {
    let tax = 0;
    const brackets = [
      { upTo: 5000 / 12, rate: 0.00 },
      { upTo: 20000 / 12, rate: 0.26 },
      { upTo: 30000 / 12, rate: 0.28 },
      { upTo: 50000 / 12, rate: 0.32 },
      { upTo: Infinity, rate: 0.35 },
    ];

    let prev = 0;
    for (const b of brackets) {
      if (monthlyTaxable > prev) {
        const slice = Math.min(monthlyTaxable, b.upTo) - prev;
        tax += slice * b.rate;
        prev = b.upTo;
      } else break;
    }
    return tax;
  }

  private roundCurrency(n: number): number {
    return Math.round((n + Number.EPSILON) * 1000) / 1000; // 3 décimales si besoin
  }

  private buildPdfDefinition(p: Payslip): any {
    const fmt = (n: number) => (n ?? 0).toFixed(3);
    return {
      content: [
        { text: 'Fiche de paie', style: 'title' },
        {
          columns: [
            { text: `Employé: ${p.employeeId}\nPériode: ${String(p.month).padStart(2,'0')}/${p.year}` },
            { text: `Créée le: ${new Date(p.createdAt || new Date()).toLocaleDateString()}`, alignment: 'right' }
          ]
        },
        { text: 'Rémunération', style: 'h2', margin: [0, 10, 0, 4] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              ['Salaire de base', fmt(p.baseSalary)],
              ...p.allowances.map(a => [a.label, fmt(a.amount)]),
              ...p.overtime.map(o => [o.label, fmt(o.amount)]),
              ...p.deductions.map(d => [`Retenue - ${d.label}`, `-${fmt(d.amount)}`]),
              [{ text: 'Brut', bold: true }, { text: fmt(p.gross), bold: true }],
            ]
          },
          layout: 'lightHorizontalLines'
        },
        { text: 'Cotisations & Impôts', style: 'h2', margin: [0, 10, 0, 4] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              ['Base CNSS', fmt(p.cnssBase)],
              ['CNSS (salarié 9.18%)', `-${fmt(p.employeeCnss)}`],
              ['CNSS (employeur 16.57%)', fmt(p.employerCnss)],
              ['Base imposable', fmt(p.taxableBase)],
              ['IRPP', `-${fmt(p.incomeTax)}`],
              [{ text: 'Net à payer', bold: true }, { text: fmt(p.net), bold: true }],
              [{ text: 'Coût employeur', italics: true }, { text: fmt(p.employerCost), italics: true }],
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        title: { fontSize: 16, bold: true, alignment: 'center', margin: [0,0,0,8] },
        h2: { fontSize: 12, bold: true }
      },
      defaultStyle: { fontSize: 10 }
    };
  }
}
