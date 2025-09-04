export interface Client {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  vatNumber?: string; // Matricule fiscal si besoin
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    delegation?: string;
    postalCode?: string;
    country?: string;
  };
  notes?: string;
  isActive?: boolean;

  // Authentication fields
  hasAccount?: boolean;
  userId?: string; // Firebase User ID
  temporaryPassword?: string; // Used only during creation
  accountCreatedAt?: any; // Date when account was created
  lastLoginAt?: any; // Last login timestamp

  createdAt?: any;  // Date | Firebase Timestamp
  updatedAt?: any;
}

export interface ClientUser {
  uid?: string;
  email: string;
  password: string;
  displayName?: string;
  clientId?: string;
  role: 'client';
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}
