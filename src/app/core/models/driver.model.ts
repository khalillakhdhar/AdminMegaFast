export interface Driver {
  id?: string;
  uid?: string;              // Firebase Auth UID
  name: string;
  displayName: string;
  phone: string;
  email: string;
  vehicle?: string;          // ex: plaque
  cin?: string;
  zones?: string[];          // zones de livraison
  active: boolean;
  createdAt?: any;
  updatedAt?: any;

  // Authentication fields
  hasAccount?: boolean;      // Indicates if driver has a user account
  userId?: string;           // Firebase Auth UID (same as uid but kept for consistency)
  temporaryPassword?: string; // Temporary password for new accounts
  accountCreatedAt?: any;    // When the account was created
  isActive?: boolean;        // Account status (for authentication)
}

export interface DriverUser {
  uid: string;               // Firebase Auth UID
  email: string;
  password?: string;         // Don't store in plaintext
  displayName: string;
  driverId?: string;         // Reference to driver document
  role: 'driver';            // User role
  isActive: boolean;         // Account status
  createdAt: any;            // Creation timestamp
  updatedAt?: any;           // Last update timestamp
}
