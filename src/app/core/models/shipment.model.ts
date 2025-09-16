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

export interface Shipment {
  id?: string;

  // Identité logistique
  barcode: string;           // code-barres / tracking
  status: ShipmentStatus;

  // Client
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;

  // Adresse
  address?: string;
  city?: string;
  delegation?: string;

  // Adresse de récupération (pickup)
  pickupAddress?: string;
  pickupCity?: string;
  pickupDelegation?: string;

  // Montant / Paiement
  amount?: number;           // COD
  paymentMode?: 'cod' | 'invoice';

  // Logistique
  weight?: number;
  volume?: number;
  notes?: string;

  // Affectations
  assignedTo?: string;       // driverId
  batchId?: string;          // lot

  // Tracking & coordonnées
  geo?: { lat: number; lng: number } | null;
  pickupGeo?: { lat: number; lng: number } | null;
  deliveryGeo?: { lat: number; lng: number } | null;

  // Métadonnées
  createdAt?: any;
  updatedAt?: any;
  history?: ShipmentHistoryEntry[];
}
