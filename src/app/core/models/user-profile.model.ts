export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'client' | 'driver';
  isActive: boolean;
  clientId?: string;
  driverId?: string;
  city?: string;
  phone?: string;
  address?: string;
  name?: string;
  photoURL?: string;
  stats?: {
    totalPackages: number;
    deliveredPackages: number;
    inTransitPackages: number;
    pendingPackages: number;
  };
}
