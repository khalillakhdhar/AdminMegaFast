export type DeliveryAttemptStatus =
  | 'scheduled'     // Tentative programmée
  | 'in_progress'   // En cours de livraison
  | 'delivered'     // Livré avec succès
  | 'failed'        // Échec de livraison
  | 'rescheduled'   // Reprogrammé
  | 'abandoned';    // Abandonné définitivement

export type FailureReason =
  | 'address_not_found'      // Adresse introuvable
  | 'recipient_unavailable'  // Destinataire absent
  | 'wrong_address'          // Adresse incorrecte
  | 'recipient_refused'      // Destinataire refuse le colis
  | 'payment_refused'        // Refus de paiement (COD)
  | 'damaged_package'        // Colis endommagé
  | 'security_issue'         // Problème de sécurité
  | 'weather_conditions'     // Conditions météo
  | 'vehicle_breakdown'      // Panne véhicule
  | 'access_restricted'      // Accès limité/interdit
  | 'incomplete_address'     // Adresse incomplète
  | 'other';                 // Autre motif

export interface DeliveryWindow {
  startTime: string;  // Format HH:mm
  endTime: string;    // Format HH:mm
  preferredTime?: string; // Heure préférée si spécifiée
}

export interface DeliveryAttempt {
  id?: string;

  // Références
  shipmentId: string;     // Référence vers le colis
  driverId: string;       // Livreur assigné
  attemptNumber: number;  // Numéro de la tentative (1, 2, 3...)

  // Planification
  scheduledDate: any;     // Date programmée (Firestore Timestamp)
  scheduledWindow?: DeliveryWindow; // Fenêtre de livraison

  // Exécution
  status: DeliveryAttemptStatus;
  startedAt?: any;        // Début de la tentative
  completedAt?: any;      // Fin de la tentative

  // Résultat en cas d'échec
  failureReason?: FailureReason;
  failureNote?: string;   // Note détaillée du livreur

  // Géolocalisation
  attemptLocation?: {
    lat: number;
    lng: number;
    accuracy?: number;    // Précision en mètres
    timestamp?: any;      // Moment de la géolocalisation
  };

  // Photos/Preuves
  proofPhotos?: string[];  // URLs des photos de preuve
  signatureUrl?: string;   // URL de la signature électronique

  // Reprogrammation
  rescheduleReason?: string;
  rescheduledDate?: any;   // Nouvelle date si reprogrammé
  rescheduledWindow?: DeliveryWindow;

  // Notifications
  clientNotified?: boolean;      // Client informé ?
  clientNotificationMethod?: 'sms' | 'email' | 'call' | 'whatsapp';
  clientResponse?: string;       // Réponse du client si contacté

  // Métadonnées
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;   // UID de qui a créé la tentative
  updatedBy?: string;   // UID de qui a modifié

  // Coûts associés (optionnel)
  additionalCosts?: {
    fuelCost?: number;
    timeCost?: number;
    distanceCost?: number;
  };

  // Conditions spéciales
  specialInstructions?: string;  // Instructions spéciales pour cette tentative
  priorityLevel?: 'low' | 'normal' | 'high' | 'urgent';
}

// Interface pour les statistiques de tentatives
export interface DeliveryAttemptStats {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageAttemptsPerDelivery: number;
  commonFailureReasons: { reason: FailureReason; count: number }[];
  successRateByTimeSlot: { timeSlot: string; successRate: number }[];
}

// Interface pour le planning des tentatives
export interface DeliverySchedule {
  date: string;           // Format YYYY-MM-DD
  timeSlots: {
    startTime: string;    // HH:mm
    endTime: string;      // HH:mm
    capacity: number;     // Nombre max de livraisons
    booked: number;       // Nombre déjà réservé
    attempts: DeliveryAttempt[];
  }[];
}

// Helpers pour les libellés
export const FAILURE_REASON_LABELS: Record<FailureReason, string> = {
  'address_not_found': 'Adresse introuvable',
  'recipient_unavailable': 'Destinataire absent',
  'wrong_address': 'Adresse incorrecte',
  'recipient_refused': 'Destinataire refuse',
  'payment_refused': 'Refus de paiement',
  'damaged_package': 'Colis endommagé',
  'security_issue': 'Problème de sécurité',
  'weather_conditions': 'Conditions météo',
  'vehicle_breakdown': 'Panne véhicule',
  'access_restricted': 'Accès restreint',
  'incomplete_address': 'Adresse incomplète',
  'other': 'Autre motif'
};

export const ATTEMPT_STATUS_LABELS: Record<DeliveryAttemptStatus, string> = {
  'scheduled': 'Programmée',
  'in_progress': 'En cours',
  'delivered': 'Livrée',
  'failed': 'Échec',
  'rescheduled': 'Reprogrammée',
  'abandoned': 'Abandonnée'
};
