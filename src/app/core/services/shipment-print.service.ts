import { Injectable } from '@angular/core';
// Note: pdfmake is dynamically imported to avoid runtime issues during module init
import { Shipment } from '../models/shipment.model';
import { Client } from '../models/client.model';
import { Batch } from '../models/batch.model';

// init des polices par défaut
// Lazy loader for pdfmake with fonts
let pdfMakeCache: Promise<any> | undefined;
async function getPdfMake() {
  pdfMakeCache ??= (async () => {
    const pm: any = await import('pdfmake/build/pdfmake');
    const pf: any = await import('pdfmake/build/vfs_fonts');
    const anyPdf = pm?.default || pm;
    const anyFonts = pf?.default || pf;
    const vfs = anyFonts?.pdfMake?.vfs || anyFonts?.vfs;
    if (vfs) {
      anyPdf.vfs = vfs;
    }
    return anyPdf;
  })();
  return pdfMakeCache;
}

export interface DriverMin {
  id?: string;
  name?: string;
  phone?: string;
  vehicle?: string;
}

@Injectable({ providedIn: 'root' })
export class ShipmentPrintService {

  /**
   * Génère un PDF de détails pour UN colis (étiquette/fiche)
   */
  async generateShipmentPdf(sh: Shipment, client?: Client, driver?: DriverMin) {
  const pdfMake = await getPdfMake();
    const statusLabel = this.statusLabel(sh.status);
  const meta = this.extractMeta(sh);
    let clientNameText = '';
    if (client?.name) {
      clientNameText = `Client: ${client.name}`;
    } else if (sh.clientName) {
      clientNameText = `Client: ${sh.clientName}`;
    }
    let clientPhoneText = '';
    if (client?.phone) {
      clientPhoneText = `Tél: ${client.phone}`;
    } else if (sh.clientPhone) {
      clientPhoneText = `Tél: ${sh.clientPhone}`;
    }
    const docDefinition: any = {
      pageSize: 'A5',
      pageMargins: [20, 20, 20, 20],
      content: [
        { text: 'FICHE COLIS', style: 'h1' },
        {
          table: {
            widths: ['*'],
            body: [[{ text: '', border: [false, false, false, true] }]]
          },
          layout: 'noBorders',
          margin: [0, 5, 0, 10]
        },

        {
          columns: [
            [
              { text: `Code: ${sh.barcode}`, style: 'h2' },
              { text: `Statut: ${statusLabel}` },
              ...(sh.paymentMode === 'cod' ? [{ text: `Montant à encaisser: ${this.money(sh.amount)}` }] : []),
              { text: `Mode: ${sh.paymentMode === 'invoice' ? 'Facture' : 'À la livraison'}` },
            ],
            [
              { text: clientNameText },
              { text: clientPhoneText },
              { text: this.formatAddress(client, sh) },
              { text: this.formatPickup(sh) }
            ]
          ]
        },

        ...(meta ? [
          // Section des produits si disponibles
          ...(meta.items && meta.items.length > 0 ? [
            { text: 'Produits', style: 'h3', margin: [0, 15, 0, 5] },
            {
              table: {
                widths: ['*', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: 'Produit', style: 'th' },
                    { text: 'Qté', style: 'th' },
                    { text: 'Prix unitaire', style: 'th' },
                    { text: 'Total', style: 'th' }
                  ],
                  ...meta.items.map((item: any) => [
                    item.description || item.name || 'Produit',
                    (item.qty || 0).toString(),
                    this.money(item.unitPrice || 0),
                    this.money((item.qty || 0) * (item.unitPrice || 0))
                  ])
                ]
              },
              layout: 'lightHorizontalLines'
            }
          ] : []),

          { text: 'Tarification', style: 'h3', margin: [0, 15, 0, 5] },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Sous-total Produits' }, { text: this.money(meta.subtotal) }],
                [{ text: 'Frais de livraison' }, { text: this.money(meta.fees?.feeTotal) }],
                [{ text: 'Total', style: 'th' }, { text: this.money((meta.subtotal || 0) + (meta.fees?.feeTotal || 0)), style: 'th' }]
              ]
            },
            layout: 'lightHorizontalLines'
          }
        ] : []),

        { text: 'Logistique', style: 'h3', margin: [0, 15, 0, 5] },
        {
          columns: [
            { text: `Poids: ${sh.weight || '-'} kg` },
            { text: `Volume: ${sh.volume || '-'} m³` },
            { text: `Livreur: ${driver?.name || '-'} (${driver?.vehicle || '—'})` },
          ]
        },

        { text: 'Notes', style: 'h3', margin: [0, 15, 0, 5] },
        { text: sh.notes || '—' },

        { text: 'Historique', style: 'h3', margin: [0, 15, 0, 5] },
        {
          table: {
            widths: ['auto', 'auto', '*'],
            body: [
              [{ text: 'Date', style: 'th' }, { text: 'Statut', style: 'th' }, { text: 'Note', style: 'th' }],
              ...(sh.history || []).map(h => [
                this.date(h.at),
                this.statusLabel(h.status),
                h.note || ''
              ])
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        h1: { fontSize: 16, bold: true },
        h2: { fontSize: 12, bold: true },
        h3: { fontSize: 11, bold: true },
        th: { bold: true }
      }
    };

  pdfMake.createPdf(docDefinition).open();
  }

  /**
   * Manifeste PDF pour un LOT (liste des colis + totaux)
   */
  async generateBatchManifestPdf(batch: Batch, shipments: Shipment[], driver?: DriverMin) {
  const pdfMake = await getPdfMake();
    // Totalise les frais de livraison depuis META (feeTotal). Si absent, fallback 0.
    const body = [
      [{ text: 'Code', style: 'th' }, { text: 'Client', style: 'th' }, { text: 'Ville', style: 'th' }, { text: 'Statut', style: 'th' }, { text: 'Frais de livraison', style: 'th' }]
    ];
    let totalFees = 0;
    shipments.forEach(s => {
      const meta = this.extractMeta(s);
      const fee = meta?.fees?.feeTotal ?? 0;
      totalFees += fee;
      body.push([
        { text: s.barcode, style: '' },
        { text: s.clientName || '', style: '' },
        { text: s.city || '', style: '' },
        { text: this.statusLabel(s.status), style: '' },
        { text: this.money(fee), style: '' }
      ]);
    });

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [20, 20, 20, 20],
      content: [
        { text: 'MANIFESTE DE LIVRAISON', style: 'h1' },
        { text: `Lot: ${batch.code || batch.id || ''}`, margin: [0, 2, 0, 0] },
        { text: `Livreur: ${driver?.name || '-' } (${driver?.vehicle || '—'})  |  Tél: ${driver?.phone || '-'}` },
        { text: `Date: ${this.date(batch.createdAt)}`, margin: [0, 0, 0, 10] },

        { table: { widths: ['auto', '*', 'auto', 'auto', 'auto'], body }, layout: 'lightHorizontalLines' },

  { text: `Total Frais de livraison: ${this.money(totalFees)}`, alignment: 'right', margin: [0, 10, 0, 0], bold: true }
      ],
      styles: {
        h1: { fontSize: 16, bold: true },
        th: { bold: true }
      }
    };

  pdfMake.createPdf(docDefinition).open();
  }

  // -------- Helpers affichage
  private statusLabel(s?: string) {
    switch (s) {
      case 'created':    return 'Créé';
      case 'assigned':   return 'Assigné';
      case 'in_transit': return 'En cours';
      case 'delivered':  return 'Livré';
      case 'returned':   return 'Retourné';
      case 'canceled':   return 'Annulé';
      default:           return s || '';
    }
  }
  private money(n?: number) {
    return (n ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'TND' });
  }
  private date(d: any) {
    let dt: Date | null = null;
    if (d?.toDate) {
      dt = d.toDate();
    } else if (d instanceof Date) {
      dt = d;
    }
    return dt ? dt.toLocaleString('fr-FR') : '';
    // si besoin: new Date(d.seconds*1000)
  }
  private formatAddress(client?: Client, sh?: Shipment) {
    const c = client?.address;
    const parts = [
      sh?.address || c?.line1,
      c?.line2,
      (sh?.delegation || c?.delegation),
      (sh?.city || c?.city),
      c?.postalCode,
      c?.country
    ].filter(Boolean);
    return parts.length ? `Adresse: ${parts.join(', ')}` : '';
  }

  private formatPickup(sh?: Shipment) {
    const parts = [
      sh?.pickupAddress,
      sh?.pickupDelegation,
      sh?.pickupCity
    ].filter(Boolean);
    return parts.length ? `Récupération: ${parts.join(', ')}` : '';
  }

  // --- Extraction META (compat: feePayment || feeCod)
  private extractMeta(sh: Shipment): { subtotal?: number; items?: any[]; fees?: { feeBase?: number; feeWeight?: number; feePayment?: number; feeDiscount?: number; feeTotal?: number } } | null {
    const notes = sh?.notes || '';
    const idx = notes.indexOf('META:');
    if (idx === -1) return null;
    try {
      const raw = notes.slice(idx + 5).trim();
      const meta = JSON.parse(raw);
      const feesIn = meta?.fees || {};
      const fees = {
        feeBase: feesIn.feeBase,
        feeWeight: feesIn.feeWeight,
        feePayment: feesIn.feePayment ?? feesIn.feeCod,
        feeDiscount: feesIn.feeDiscount,
        feeTotal: feesIn.feeTotal,
      };
      return {
        subtotal: meta?.subtotal,
        items: meta?.items || [],
        fees
      };
    } catch {
      return null;
    }
  }
}
