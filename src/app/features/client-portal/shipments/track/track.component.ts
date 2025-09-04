import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ClientShipmentService } from '../../../../core/services/client-shipment.service';
import { Shipment } from '../../../../core/models/shipment.model';

@Component({
  selector: 'app-shipments-track',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './track.component.html',
  styleUrls: ['./track.component.scss']
})
export class ShipmentsTrackComponent {

  trackingCode: string = '';
  isSearching: boolean = false;
  searchPerformed: boolean = false;
  foundShipment: Shipment | null = null;

  constructor(
    private clientShipmentService: ClientShipmentService
  ) {}

  searchShipment(): void {
    if (!this.trackingCode.trim()) {
      return;
    }

    this.isSearching = true;
    this.foundShipment = null;

    this.clientShipmentService.searchByBarcode(this.trackingCode.trim()).subscribe({
      next: (shipments) => {
        this.searchPerformed = true;
        this.foundShipment = shipments.length > 0 ? shipments[0] : null;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Erreur lors de la recherche:', error);
        this.searchPerformed = true;
        this.foundShipment = null;
        this.isSearching = false;
      }
    });
  }

  getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      created: 'Colis créé',
      assigned: 'Assigné à un livreur',
      in_transit: 'En cours de livraison',
      delivered: 'Livré',
      returned: 'Retourné',
      canceled: 'Annulé'
    };
    return statusLabels[status] || status;
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      created: 'badge-soft-secondary',
      assigned: 'badge-soft-warning',
      in_transit: 'badge-soft-info',
      delivered: 'badge-soft-success',
      returned: 'badge-soft-danger',
      canceled: 'badge-soft-dark'
    };
    return statusClasses[status] || 'badge-soft-secondary';
  }

  getStatusIcon(status: string): string {
    const statusIcons: Record<string, string> = {
      created: 'bx-plus-circle',
      assigned: 'bx-user',
      in_transit: 'bx-car',
      delivered: 'bx-check-circle',
      returned: 'bx-undo',
      canceled: 'bx-x-circle'
    };
    return statusIcons[status] || 'bx-circle';
  }

  getTimelineMarkerClass(status: string): string {
    const markerClasses: Record<string, string> = {
      created: 'bg-secondary',
      assigned: 'bg-warning',
      in_transit: 'bg-info',
      delivered: 'bg-success',
      returned: 'bg-danger',
      canceled: 'bg-dark'
    };
    return markerClasses[status] || 'bg-secondary';
  }
}
