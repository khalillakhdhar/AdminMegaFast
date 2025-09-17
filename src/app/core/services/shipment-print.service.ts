import { Injectable } from '@angular/core';
// Note: pdfmake is dynamically imported to avoid runtime issues during module init
import { Shipment, ContactInfo, DetailedAddress, PackageDetails } from '../models/shipment.model';
import { Client } from '../models/client.model';
import { DeliveryAttempt, FAILURE_REASON_LABELS, ATTEMPT_STATUS_LABELS } from '../models/delivery-attempt.model';

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
   * Génère une étiquette de livraison professionnelle (format compact)
   */
  async generateShippingLabel(sh: Shipment, client?: Client, driver?: DriverMin) {
    const pdfMake = await getPdfMake();

    // Données expéditeur et destinataire
    const sender = this.getSenderInfo(sh);
    const recipient = this.getRecipientInfo(sh, client);

    const docDefinition: any = {
      pageSize: 'A6',
      pageOrientation: 'landscape',
      pageMargins: [10, 10, 10, 10],
      content: [
        // En-tête avec logo et informations entreprise
        this.buildHeader(),

        // Informations principales
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: 'EXPÉDITEUR', style: 'sectionHeader' },
                this.buildContactBlock(sender),
                { text: '', margin: [0, 5] },
                { text: 'SERVICE', style: 'sectionHeader' },
                { text: this.getServiceType(sh), style: 'serviceType' }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: 'DESTINATAIRE', style: 'sectionHeader' },
                this.buildContactBlock(recipient),
                { text: '', margin: [0, 5] },
                { text: 'LIVRAISON', style: 'sectionHeader' },
                { text: this.getDeliveryInstructions(sh), fontSize: 8 }
              ]
            }
          ]
        },

        // Code-barres et tracking
        { text: '', margin: [0, 5] },
        {
          table: {
            widths: ['*'],
            body: [[
              {
                stack: [
                  { text: sh.barcode, style: 'barcode' },
                  { text: 'Tracking: ' + sh.barcode, style: 'trackingText' }
                ],
                alignment: 'center'
              }
            ]]
          },
          layout: 'noBorders'
        }
      ],
      styles: this.getLabelStyles()
    };

    pdfMake.createPdf(docDefinition).open();
  }

  /**
   * Génère une fiche de livraison complète avec historique des tentatives
   */
  async generateDeliverySheet(sh: Shipment, client?: Client, driver?: DriverMin, attempts?: DeliveryAttempt[]) {
    const pdfMake = await getPdfMake();
    const statusLabel = this.statusLabel(sh.status);
    const meta = this.extractMeta(sh);

    // Données enrichies
    const sender = this.getSenderInfo(sh);
    const recipient = this.getRecipientInfo(sh, client);

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [20, 20, 20, 20],
      content: [
        // En-tête professionnel
        this.buildHeader(true),

        { text: 'FICHE DE LIVRAISON DÉTAILLÉE', style: 'title' },

        // Informations principales
        {
          columns: [
            {
              width: '70%',
              stack: [
                { text: `Code de suivi: ${sh.barcode}`, style: 'h2' },
                { text: `Statut: ${statusLabel}`, style: 'status' },
                { text: `Priorité: ${this.getPriorityLabel(sh.priority)}`, style: 'priority' },
                { text: `Service: ${this.getServiceType(sh)}` }
              ]
            },
            {
              width: '30%',
              stack: [
                { text: `Créé le: ${this.date(sh.createdAt)}`, fontSize: 10 },
                { text: `Tentative: ${sh.currentAttempt || 1}/${sh.maxAttempts || 3}`, fontSize: 10 },
                ...(sh.promisedDeliveryDate ? [{ text: `Promis le: ${this.date(sh.promisedDeliveryDate)}`, fontSize: 10 }] : [])
              ]
            }
          ]
        },

        { text: '', margin: [0, 10] },

        // Expéditeur et Destinataire
        {
          columns: [
            {
              width: '48%',
              stack: [
                { text: 'EXPÉDITEUR', style: 'h3' },
                this.buildDetailedContactBlock(sender)
              ]
            },
            { width: '4%', text: '' },
            {
              width: '48%',
              stack: [
                { text: 'DESTINATAIRE', style: 'h3' },
                this.buildDetailedContactBlock(recipient)
              ]
            }
          ]
        },

        { text: '', margin: [0, 10] },

        // Détails du colis
        ...(sh.packageDetails ? [
          { text: 'DÉTAILS DU COLIS', style: 'h3' },
          this.buildPackageDetailsSection(sh.packageDetails),
          { text: '', margin: [0, 10] }
        ] : []),

        // Informations de paiement
        ...(sh.amount ? [
          { text: 'PAIEMENT', style: 'h3' },
          {
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Mode de paiement' }, { text: this.getPaymentModeLabel(sh.paymentMode) }],
                [{ text: 'Montant à encaisser' }, { text: this.money(sh.amount) }],
                ...(sh.paymentInstructions ? [[{ text: 'Instructions' }, { text: sh.paymentInstructions }]] : [])
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 5, 0, 10]
          }
        ] : []),

        // Produits (si disponibles via META)
        ...(meta?.items && meta.items.length > 0 ? [
          { text: 'PRODUITS', style: 'h3' },
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
            layout: 'lightHorizontalLines',
            margin: [0, 5, 0, 10]
          }
        ] : []),

        // Logistique
        { text: 'INFORMATIONS LOGISTIQUES', style: 'h3' },
        {
          columns: [
            [
              { text: `Poids: ${sh.weight || '-'} kg` },
              { text: `Volume: ${sh.volume || '-'} m³` },
              ...(sh.dimensions ? [{ text: `Dimensions: ${sh.dimensions.length}×${sh.dimensions.width}×${sh.dimensions.height} ${sh.dimensions.unit}` }] : [])
            ],
            [
              { text: `Livreur: ${driver?.name || 'Non assigné'}` },
              { text: `Véhicule: ${driver?.vehicle || '-'}` },
              { text: `Contact: ${driver?.phone || '-'}` }
            ]
          ],
          margin: [0, 5, 0, 10]
        },

        // Instructions spéciales
        ...(sh.deliveryPreferences?.specialInstructions || sh.notes ? [
          { text: 'INSTRUCTIONS SPÉCIALES', style: 'h3' },
          { text: sh.deliveryPreferences?.specialInstructions || sh.notes || '', margin: [0, 5, 0, 10] }
        ] : []),

        // Historique des tentatives de livraison
        ...(attempts && attempts.length > 0 ? [
          { text: 'HISTORIQUE DES TENTATIVES', style: 'h3' },
          {
            table: {
              widths: ['auto', 'auto', 'auto', '*', '*'],
              body: [
                [
                  { text: 'Tentative', style: 'th' },
                  { text: 'Date', style: 'th' },
                  { text: 'Statut', style: 'th' },
                  { text: 'Motif', style: 'th' },
                  { text: 'Note', style: 'th' }
                ],
                ...attempts.map(attempt => [
                  attempt.attemptNumber.toString(),
                  this.date(attempt.scheduledDate),
                  ATTEMPT_STATUS_LABELS[attempt.status] || attempt.status,
                  attempt.failureReason ? FAILURE_REASON_LABELS[attempt.failureReason] : '-',
                  attempt.failureNote || '-'
                ])
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 5, 0, 10]
          }
        ] : []),

        // Historique général
        { text: 'HISTORIQUE GÉNÉRAL', style: 'h3' },
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
        },

        // Pied de page avec signatures
        { text: '', margin: [0, 20] },
        {
          columns: [
            {
              width: '45%',
              stack: [
                { text: 'Signature du livreur:', fontSize: 10 },
                { text: '', margin: [0, 30] },
                { text: 'Date: _______________', fontSize: 10 }
              ]
            },
            { width: '10%', text: '' },
            {
              width: '45%',
              stack: [
                { text: 'Signature du destinataire:', fontSize: 10 },
                { text: '', margin: [0, 30] },
                { text: 'Date: _______________', fontSize: 10 }
              ]
            }
          ]
        }
      ],
      styles: this.getDetailedStyles()
    };

    pdfMake.createPdf(docDefinition).open();
  }

  /**
   * Méthode legacy pour compatibilité (délègue vers generateDeliverySheet)
   */
  async generateShipmentPdf(sh: Shipment, client?: Client, driver?: DriverMin) {
    return this.generateDeliverySheet(sh, client, driver);
  }

  // =============== MÉTHODES HELPER LEGACY (maintien compatibilité) ===============

  /**
   * Extrait les informations de l'expéditeur
   */
  private getSenderInfo(sh: Shipment): ContactInfo & { address?: DetailedAddress } {
    return {
      name: sh.sender?.name || 'MegaFast Express',
      company: sh.sender?.company || 'MegaFast Express',
      phone: sh.sender?.phone || '+216 XX XXX XXX',
      email: sh.sender?.email || 'contact@megafast.tn',
      address: sh.senderAddress || {
        line1: 'Zone Industrielle',
        city: 'Tunis',
        country: 'Tunisie'
      }
    };
  }

  /**
   * Extrait les informations du destinataire
   */
  private getRecipientInfo(sh: Shipment, client?: Client): ContactInfo & { address?: DetailedAddress } {
    const recipientInfo: ContactInfo & { address?: DetailedAddress } = {
      name: sh.recipient?.name || sh.clientName || client?.name || 'Non spécifié',
      company: sh.recipient?.company || client?.company,
      phone: sh.recipient?.phone || sh.clientPhone || client?.phone || '',
      email: sh.recipient?.email || sh.clientEmail || client?.email,
      alternativePhone: sh.recipient?.alternativePhone
    };

    // Adresse enrichie ou fallback vers les champs legacy
    if (sh.recipientAddress) {
      recipientInfo.address = sh.recipientAddress;
    } else {
      recipientInfo.address = {
        line1: sh.address || client?.address?.line1 || '',
        line2: client?.address?.line2,
        city: sh.city || client?.address?.city || '',
        delegation: sh.delegation || client?.address?.delegation,
        postalCode: client?.address?.postalCode,
        country: client?.address?.country || 'Tunisie'
      };
    }

    return recipientInfo;
  }

  /**
   * Détermine le type de service
   */
  private getServiceType(sh: Shipment): string {
    switch (sh.serviceType) {
      case 'express': return 'EXPRESS';
      case 'same_day': return 'SAME DAY';
      case 'scheduled': return 'PROGRAMMÉ';
      default: return 'STANDARD';
    }
  }

  /**
   * Récupère le libellé de priorité
   */
  private getPriorityLabel(priority?: string): string {
    switch (priority) {
      case 'urgent': return 'URGENT';
      case 'high': return 'HAUTE';
      case 'low': return 'BASSE';
      default: return 'NORMALE';
    }
  }

  /**
   * Récupère le libellé du mode de paiement
   */
  private getPaymentModeLabel(mode?: string): string {
    switch (mode) {
      case 'cod': return 'Paiement à la livraison';
      case 'invoice': return 'Facture';
      case 'prepaid': return 'Prépayé';
      case 'account': return 'Compte client';
      default: return 'Non spécifié';
    }
  }

  /**
   * Récupère les instructions de livraison
   */
  private getDeliveryInstructions(sh: Shipment): string {
    const instructions: string[] = [];

    if (sh.deliveryPreferences?.specialInstructions) {
      instructions.push(sh.deliveryPreferences.specialInstructions);
    }

    if (sh.deliveryPreferences?.requiresSignature) {
      instructions.push('Signature requise');
    }

    if (sh.deliveryPreferences?.requiresID) {
      instructions.push('Pièce d\'identité requise');
    }

    if (sh.packageDetails?.isFragile) {
      instructions.push('FRAGILE');
    }

    if (sh.packageDetails?.requiresRefrigeration) {
      instructions.push('Réfrigération requise');
    }

    return instructions.length > 0 ? instructions.join(' • ') : 'Livraison standard';
  }

  // =============== MÉTHODES BUILDER POUR PDF ===============

  /**
   * Construit l'en-tête avec logo
   */
  private buildHeader(detailed = false): any {
    return {
      columns: [
        {
          width: 'auto',
          stack: [
            { text: 'MEGAFAST', style: 'logo' },
            { text: 'EXPRESS DELIVERY', style: 'logoSub' }
          ]
        },
        {
          width: '*',
          stack: [
            { text: detailed ? 'FICHE DE LIVRAISON DÉTAILLÉE' : 'ÉTIQUETTE DE LIVRAISON', style: 'headerTitle', alignment: 'right' },
            { text: `Généré le: ${new Date().toLocaleString('fr-FR')}`, fontSize: 8, alignment: 'right' }
          ]
        }
      ],
      margin: [0, 0, 0, 10]
    };
  }

  /**
   * Construit un bloc de contact compact
   */
  private buildContactBlock(contact: ContactInfo & { address?: DetailedAddress }): any[] {
    const result: any[] = [
      { text: contact.name, style: 'contactName' }
    ];

    if (contact.company) {
      result.push({ text: contact.company, style: 'contactCompany' });
    }

    result.push({ text: contact.phone, style: 'contactPhone' });

    if (contact.address) {
      const addressParts = [
        contact.address.line1,
        contact.address.line2,
        contact.address.city,
        contact.address.delegation
      ].filter(Boolean);

      result.push({ text: addressParts.join(', '), fontSize: 8 });
    }

    return result;
  }

  /**
   * Construit un bloc de contact détaillé
   */
  private buildDetailedContactBlock(contact: ContactInfo & { address?: DetailedAddress }): any {
    const contactInfo: any[] = [
      { text: contact.name, style: 'contactName' }
    ];

    if (contact.company) {
      contactInfo.push({ text: contact.company, style: 'contactCompany' });
    }

    contactInfo.push({ text: `Tél: ${contact.phone}` });

    if (contact.alternativePhone) {
      contactInfo.push({ text: `Tél 2: ${contact.alternativePhone}` });
    }

    if (contact.email) {
      contactInfo.push({ text: `Email: ${contact.email}` });
    }

    if (contact.address) {
      const address = contact.address;
      contactInfo.push({ text: 'ADRESSE:', style: 'subHeader', margin: [0, 5, 0, 2] });

      if (address.line1) contactInfo.push({ text: address.line1 });
      if (address.line2) contactInfo.push({ text: address.line2 });

      const cityLine = [address.city, address.delegation, address.postalCode].filter(Boolean).join(', ');
      if (cityLine) contactInfo.push({ text: cityLine });

      if (address.country) contactInfo.push({ text: address.country });

      if (address.landmark) {
        contactInfo.push({ text: `Repère: ${address.landmark}`, fontSize: 9, italics: true });
      }

      if (address.accessInstructions) {
        contactInfo.push({ text: `Accès: ${address.accessInstructions}`, fontSize: 9, italics: true });
      }
    }

    return { stack: contactInfo };
  }

  /**
   * Construit la section détails du colis
   */
  private buildPackageDetailsSection(packageDetails: PackageDetails): any {
    const sections: any[] = [
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Description' }, { text: packageDetails.description }],
            [{ text: 'Catégorie' }, { text: this.getCategoryLabel(packageDetails.category) }],
            ...(packageDetails.totalValue ? [[{ text: 'Valeur déclarée' }, { text: this.money(packageDetails.totalValue) }]] : [])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 5, 0, 10]
      }
    ];

    // Caractéristiques spéciales
    const specialProps: string[] = [];
    if (packageDetails.isFragile) specialProps.push('FRAGILE');
    if (packageDetails.requiresRefrigeration) specialProps.push('RÉFRIGÉRATION');
    if (packageDetails.requiresUpright) specialProps.push('MAINTENIR DEBOUT');
    if (packageDetails.hazardousMaterial) specialProps.push('MATIÈRE DANGEREUSE');

    if (specialProps.length > 0) {
      sections.push({
        text: `Spécial: ${specialProps.join(' • ')}`,
        style: 'warning',
        margin: [0, 5, 0, 10]
      });
    }

    // Items détaillés
    if (packageDetails.items && packageDetails.items.length > 0) {
      sections.push({
        text: 'CONTENU DÉTAILLÉ:',
        style: 'subHeader',
        margin: [0, 10, 0, 5]
      });

      sections.push({
        table: {
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Article', style: 'th' },
              { text: 'Qté', style: 'th' },
              { text: 'Valeur unit.', style: 'th' },
              { text: 'Total', style: 'th' }
            ],
            ...packageDetails.items.map(item => [
              item.name,
              item.quantity.toString(),
              item.value ? this.money(item.value) : '-',
              item.value ? this.money(item.quantity * item.value) : '-'
            ])
          ]
        },
        layout: 'lightHorizontalLines'
      });
    }

    return sections;
  }

  /**
   * Récupère le libellé de catégorie
   */
  private getCategoryLabel(category?: string): string {
    switch (category) {
      case 'electronics': return 'Électronique';
      case 'clothing': return 'Vêtements';
      case 'food': return 'Alimentaire';
      case 'documents': return 'Documents';
      case 'medical': return 'Médical';
      case 'fragile': return 'Fragile';
      default: return 'Autre';
    }
  }

  // =============== STYLES POUR LES PDF ===============

  /**
   * Styles pour les étiquettes
   */
  private getLabelStyles(): any {
    return {
      logo: { fontSize: 14, bold: true, color: '#2563eb' },
      logoSub: { fontSize: 8, color: '#64748b' },
      headerTitle: { fontSize: 10, bold: true },
      sectionHeader: { fontSize: 9, bold: true, color: '#374151', margin: [0, 0, 0, 3] },
      contactName: { fontSize: 10, bold: true },
      contactCompany: { fontSize: 9, italics: true },
      contactPhone: { fontSize: 9 },
      serviceType: { fontSize: 10, bold: true, color: '#dc2626' },
      barcode: { fontSize: 16, bold: true, margin: [0, 5] },
      trackingText: { fontSize: 8, color: '#64748b' }
    };
  }

  /**
   * Styles pour les fiches détaillées
   */
  private getDetailedStyles(): any {
    return {
      title: { fontSize: 18, bold: true, margin: [0, 10, 0, 15], alignment: 'center' },
      logo: { fontSize: 16, bold: true, color: '#2563eb' },
      logoSub: { fontSize: 10, color: '#64748b' },
      headerTitle: { fontSize: 12, bold: true },
      h1: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
      h2: { fontSize: 14, bold: true, color: '#1f2937' },
      h3: { fontSize: 12, bold: true, color: '#374151', margin: [0, 10, 0, 5] },
      subHeader: { fontSize: 10, bold: true, color: '#4b5563' },
      status: { fontSize: 12, bold: true, color: '#059669' },
      priority: { fontSize: 11, bold: true, color: '#dc2626' },
      contactName: { fontSize: 11, bold: true },
      contactCompany: { fontSize: 10, italics: true, color: '#6b7280' },
      warning: { fontSize: 10, bold: true, color: '#dc2626', background: '#fef2f2', margin: [5, 5] },
      th: { bold: true, fillColor: '#f3f4f6' }
    };
  }
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
