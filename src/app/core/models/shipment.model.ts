export type ShipmentStatus =
  | 'created'
  | 'assigned'
  | 'in_transit'
  | 'delivered'
  | 'returned'
  | 'canceled';

export interface ShipmentHistoryEntry {
  at: any;             // Date | Firebase Timestamp
  by?: string;         // uid user
  status: ShipmentStatus;
  note?: string;
}

// Informations détaillées de contact
export interface ContactInfo {
  name: string;
  company?: string;
  phone: string;
  email?: string;
  alternativePhone?: string;
  preferredContactMethod?: 'phone' | 'email' | 'sms' | 'whatsapp';
  languages?: string[];  // Langues parlées ['fr', 'ar', 'en']
}

// Adresse complète avec instructions
export interface DetailedAddress {
  line1: string;           // Adresse principale
  line2?: string;          // Complément d'adresse
  city: string;
  delegation?: string;
  postalCode?: string;
  country?: string;
  landmark?: string;       // Point de repère
  accessInstructions?: string;  // Instructions d'accès
  floorNumber?: string;
  apartmentNumber?: string;
  buildingName?: string;
  gateCode?: string;       // Code portail/interphone
  coordinates?: { lat: number; lng: number };
}

// Fenêtre de livraison préférée
export interface DeliveryPreferences {
  preferredTimeSlots?: {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
  }[];
  avoidTimeSlots?: {
    startTime: string;
    endTime: string;
    reason?: string;
  }[];
  specialInstructions?: string;
  requiresSignature?: boolean;
  requiresID?: boolean;
  maxDeliveryAttempts?: number;
  allowNeighborDelivery?: boolean;
  allowSafePlace?: boolean;
  safePlaceInstructions?: string;
}

// Informations sur le contenu du colis
export interface PackageDetails {
  description: string;
  category?: 'electronics' | 'clothing' | 'food' | 'documents' | 'medical' | 'fragile' | 'other';
  items?: {
    name: string;
    quantity: number;
    value?: number;
    sku?: string;
    description?: string;
  }[];
  totalValue?: number;
  currency?: string;
  isFragile?: boolean;
  requiresRefrigeration?: boolean;
  requiresUpright?: boolean;
  hazardousMaterial?: boolean;
  customsDeclaration?: string;
}

export interface Shipment {
  id?: string;

  // Identité logistique
  barcode: string;           // code-barres / tracking
  status: ShipmentStatus;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  serviceType?: 'standard' | 'express' | 'same_day' | 'scheduled';

  // === EXPÉDITEUR (Informations enrichies) ===
  sender?: ContactInfo;
  senderAddress?: DetailedAddress;

  // === CLIENT/DESTINATAIRE (Informations enrichies) ===
  clientId?: string;
  // Maintien rétrocompatibilité avec les champs existants
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  // Nouvelles informations détaillées
  recipient?: ContactInfo;
  recipientAddress?: DetailedAddress;
  deliveryPreferences?: DeliveryPreferences;

  // Adresse legacy (maintien compatibilité)
  address?: string;
  city?: string;
  delegation?: string;

  // Adresse de récupération (pickup) - enrichie
  pickupAddress?: string;
  pickupCity?: string;
  pickupDelegation?: string;
  pickupLocation?: DetailedAddress;

  // === DÉTAILS DU COLIS ===
  packageDetails?: PackageDetails;

  // Montant / Paiement (enrichi)
  amount?: number;           // COD
  paymentMode?: 'cod' | 'invoice' | 'prepaid' | 'account';
  paymentInstructions?: string;
  acceptedPaymentMethods?: ('cash' | 'card' | 'mobile_payment' | 'check')[];

  // Logistique (enrichi)
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'inch';
  };
  volume?: number;
  notes?: string;

  // === AFFECTATIONS ET TENTATIVES ===
  assignedTo?: string;       // driverId
  deliveryAttemptIds?: string[];  // Références aux tentatives de livraison
  maxAttempts?: number;      // Nombre maximum de tentatives autorisées
  currentAttempt?: number;   // Numéro de la tentative actuelle

  // Tracking & coordonnées (legacy - maintien compatibilité)
  geo?: { lat: number; lng: number } | null;
  pickupGeo?: { lat: number; lng: number } | null;
  deliveryGeo?: { lat: number; lng: number } | null;

  // === PLANIFICATION ===
  scheduledDeliveryDate?: any;  // Date de livraison souhaitée
  estimatedDeliveryDate?: any;  // Date estimée par le système
  promisedDeliveryDate?: any;   // Date promise au client

  // === ASSURANCE ET RESPONSABILITÉ ===
  insuranceValue?: number;
  signatureRequired?: boolean;
  photoProofRequired?: boolean;

  // === COMMUNICATION ===
  clientNotifications?: {
    smsEnabled?: boolean;
    emailEnabled?: boolean;
    whatsappEnabled?: boolean;
    notificationPreference?: 'minimal' | 'standard' | 'detailed';
  };

  // === RETOURS ET ÉCHANGES ===
  returnPolicy?: {
    isReturnable?: boolean;
    returnWindow?: number;  // Jours
    returnReason?: string;
    returnInstructions?: string;
  };
  exchangeInfo?: {
    isExchangeable?: boolean;
    exchangeReason?: string;
    newProductDetails?: string;
  };

  // Métadonnées (enrichies)
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;    // UID de l'utilisateur créateur
  lastModifiedBy?: string;
  history?: ShipmentHistoryEntry[];
  tags?: string[];       // Tags pour classification/recherche
  internalNotes?: string;  // Notes internes (non visibles client)

  // Intégrations externes
  externalTrackingNumber?: string;
  externalCarrier?: string;
  externalCarrierService?: string;
}
