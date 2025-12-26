import { GeolocationPosition } from "../services/geolocation.service";

export interface ClientAddress {
  id?: string;
  label: string; // 'home', 'work', 'other'
  line1: string;
  line2?: string;
  city: string;
  delegation: string;
  postalCode?: string;
  country: string;
  coordinates?: google.maps.LatLngLiteral;
  isDefault: boolean;
  deliveryInstructions?: string;
  accessCode?: string;
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt?: any;
}

export interface ClientLocationPreferences {
  allowTracking: boolean; // Autoriser suivi des livraisons
  shareLocationWithDrivers: boolean; // Partager localisation avec livreurs
  receiveLocationNotifications: boolean; // Notifications de géolocalisation
  trackingRadius: number; // Rayon de notification en mètres
  preferredDeliveryWindow?: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
}

export interface ClientNotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  deliveryUpdates: boolean;
  promotionalOffers: boolean;
  orderConfirmations: boolean;
  driverLocationUpdates: boolean;
}

export interface ClientStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: any;
  favoriteAddresses: string[]; // IDs des adresses les plus utilisées
  frequentDeliveryTimes: string[]; // Créneaux de livraison préférés
  cancelationRate: number;
  onTimeDeliveryRate: number;
}

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

  // Extensions pour profil avancé
  addresses?: ClientAddress[]; // Adresses multiples
  primaryAddressId?: string; // ID de l'adresse principale
  profilePicture?: string; // URL de la photo de profil
  dateOfBirth?: any; // Date de naissance
  gender?: "male" | "female" | "other";

  // Préférences de géolocalisation
  locationPreferences?: ClientLocationPreferences;
  notificationPreferences?: ClientNotificationPreferences;

  // Informations de contact étendues
  alternativePhone?: string;
  whatsappNumber?: string;
  preferredContactMethod?: "phone" | "email" | "sms" | "whatsapp";

  // Statistiques et historique
  stats?: ClientStats;
  memberSince?: any; // Date d'inscription
  lastOrderDate?: any; // Dernière commande
  totalOrders?: number; // Nombre total de commandes
  totalSpent?: number; // Montant total dépensé

  // Paramètres de sécurité
  securitySettings?: {
    twoFactorEnabled: boolean;
    orderConfirmationRequired: boolean;
    addressVerificationRequired: boolean;
  };

  // Authentication fields
  hasAccount?: boolean;
  userId?: string; // Firebase User ID
  temporaryPassword?: string; // Used only during creation
  passwordSetByAdmin?: boolean; // True if password was set by admin directly
  accountCreatedAt?: any; // Date when account was created
  lastLoginAt?: any; // Last login timestamp

  createdAt?: any; // Date | Firebase Timestamp
  updatedAt?: any;
}

export interface ClientUser {
  uid?: string;
  email: string;
  password: string;
  displayName?: string;
  clientId?: string;
  role: "client";
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
  lastLoginAt?: any;

  // Extensions sécurité
  loginAttempts?: number; // Tentatives de connexion échouées
  lockedUntil?: any; // Verrouillage temporaire du compte
  passwordChangedAt?: any; // Dernière modification du mot de passe
  deviceTokens?: string[]; // Tokens pour notifications push
  securityQuestions?: {
    question: string;
    answerHash: string; // Hash de la réponse
  }[];
}

// Interfaces additionnelles pour la géolocalisation
export interface ClientLocationHistory {
  clientId: string;
  position: GeolocationPosition;
  context: "order_placed" | "delivery_request" | "manual_check";
  timestamp: any;
  accuracy?: number;
}

export interface ClientDeliveryZone {
  clientId: string;
  addressId: string;
  zone: {
    center: google.maps.LatLngLiteral;
    radius: number; // en mètres
    boundaries?: google.maps.LatLngLiteral[]; // Polygone si spécifique
  };
  deliveryPreferences: {
    timeWindows: { start: string; end: string }[];
    specialInstructions: string;
    accessRequirements: string[];
  };
  isActive: boolean;
  createdAt: any;
}
