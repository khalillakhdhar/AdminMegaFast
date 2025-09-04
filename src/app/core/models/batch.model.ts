export type BatchStatus = 'planned' | 'in_progress' | 'completed' | 'canceled';

export interface Batch {
  id?: string;
  code?: string;            // ex: LOT-2025-0001
  assignedTo: string;       // driverId
  shipmentIds: string[];

  status: BatchStatus;
  createdAt?: any;
  updatedAt?: any;

  // stats calculées
  totalShipments?: number;
  deliveredShipments?: number;
  totalAmount?: number;     // COD livré
  plannedAt?: any;          // date/heure de sortie
}
