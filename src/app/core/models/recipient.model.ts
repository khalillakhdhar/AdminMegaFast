export interface Recipient {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  address: {
    line1: string;
    line2?: string;
    governorate: string;
    delegation?: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  notes?: string;

  // Timestamp de création pour ce destinataire
  createdAt?: any;
}

export interface RecipientFormData {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  governorate: string;
  delegation?: string;
  postalCode?: string;
  notes?: string;
}
