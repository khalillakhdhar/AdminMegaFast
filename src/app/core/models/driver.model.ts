import { GeolocationPosition } from "../services/geolocation.service";

export interface DriverVehicle {
  type: "car" | "motorcycle" | "van" | "truck";
  brand?: string;
  model?: string;
  licensePlate: string;
  color?: string;
  fuelType?: "gasoline" | "diesel" | "electric" | "hybrid";
  maxCapacity?: number; // en kg
  year?: number;
}

export interface DriverLocation {
  position: GeolocationPosition;
  status: "online" | "offline" | "busy" | "available";
  activity: "idle" | "driving" | "delivering" | "pickup";
  lastUpdate: any; // Firebase Timestamp
  sessionId?: string;
  accuracy?: number;
  battery?: number; // Niveau batterie du téléphone
}

export interface DriverLocationPreferences {
  enableTracking: boolean;
  shareLocationWithClients: boolean;
  trackingInterval: number; // en secondes
  highAccuracyMode: boolean;
  offlineMode: boolean;
  notifyOnGeofence: boolean;
}

export interface DriverZone {
  id: string;
  name: string;
  type: "preferred" | "assigned" | "restricted";
  coordinates: google.maps.LatLngLiteral[];
  priority: number;
  active: boolean;
}

export interface DriverStats {
  totalDeliveries: number;
  totalDistance: number; // en km
  totalTime: number; // en heures
  averageDeliveryTime: number; // en minutes
  successRate: number; // pourcentage
  lastMonthStats: {
    deliveries: number;
    distance: number;
    earnings: number;
  };
  ratings: {
    average: number;
    totalRatings: number;
    breakdown: { [stars: number]: number };
  };
}

export interface Driver {
  id?: string;
  uid?: string; // Firebase Auth UID
  name: string;
  displayName: string;
  phone: string;
  email: string;
  vehicle?: DriverVehicle; // Informations véhicule étendues
  cin?: string;
  zones?: DriverZone[]; // Zones de livraison étendues
  active: boolean;
  status?: "available" | "busy" | "offline"; // Driver status
  createdAt?: any;
  updatedAt?: any;

  // Extension géolocalisation
  currentLocation?: DriverLocation;
  locationHistory?: GeolocationPosition[];
  locationPreferences?: DriverLocationPreferences;
  workingHours?: {
    monday?: { start: string; end: string; active: boolean };
    tuesday?: { start: string; end: string; active: boolean };
    wednesday?: { start: string; end: string; active: boolean };
    thursday?: { start: string; end: string; active: boolean };
    friday?: { start: string; end: string; active: boolean };
    saturday?: { start: string; end: string; active: boolean };
    sunday?: { start: string; end: string; active: boolean };
  };

  // Informations personnelles étendues
  profilePicture?: string; // URL de la photo de profil
  dateOfBirth?: any; // Date de naissance
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    delegation?: string;
    postalCode?: string;
    country?: string;
    coordinates?: google.maps.LatLngLiteral;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };

  // Statistiques et performances
  stats?: DriverStats;
  rating?: number; // Note moyenne
  totalRatings?: number; // Nombre total d'évaluations

  // Paramètres de sécurité
  deviceId?: string; // ID de l'appareil mobile
  lastDeviceUpdate?: any; // Dernière mise à jour de l'appareil
  securitySettings?: {
    twoFactorEnabled: boolean;
    locationAlertsEnabled: boolean;
    emergencyContactsEnabled: boolean;
  };

  // Authentication fields
  hasAccount?: boolean; // Indicates if driver has a user account
  userId?: string; // Firebase Auth UID (same as uid but kept for consistency)
  temporaryPassword?: string; // Temporary password for new accounts
  passwordSetByAdmin?: boolean; // True if password was set by admin directly
  accountCreatedAt?: any; // When the account was created
  isActive?: boolean; // Account status (for authentication)
}

export interface DriverUser {
  uid: string; // Firebase Auth UID
  email: string;
  password?: string; // Don't store in plaintext
  displayName: string;
  driverId?: string; // Reference to driver document
  role: "driver"; // User role
  isActive: boolean; // Account status
  createdAt: any; // Creation timestamp
  updatedAt?: any; // Last update timestamp

  // Extension sécurité
  lastLoginAt?: any; // Dernière connexion
  loginAttempts?: number; // Tentatives de connexion échouées
  lockedUntil?: any; // Verrouillage temporaire du compte
  passwordChangedAt?: any; // Dernière modification du mot de passe
  deviceTokens?: string[]; // Tokens pour notifications push
}

// Interfaces additionnelles pour la géolocalisation
export interface DriverLocationUpdate {
  driverId: string;
  position: GeolocationPosition;
  timestamp: any;
  metadata?: {
    battery?: number;
    network?: "wifi" | "4g" | "3g" | "offline";
    speed?: number;
    accuracy?: number;
  };
}

export interface DriverRoute {
  driverId: string;
  date: string; // YYYY-MM-DD
  startLocation: GeolocationPosition;
  endLocation?: GeolocationPosition;
  waypoints: GeolocationPosition[];
  totalDistance: number;
  totalTime: number;
  deliveriesCount: number;
  fuelConsumption?: number;
  createdAt: any;
  completedAt?: any;
}

// Interface Delivery pour les livraisons
export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address: string;
  position: google.maps.LatLngLiteral;
  status: "pending" | "in_progress" | "delivered" | "failed";
  priority: "low" | "normal" | "high" | "urgent";
  instructions?: string;
  deliveryWindow?: {
    start: string;
    end: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    description?: string;
  }>;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  createdAt: any;
  updatedAt?: any;
}
