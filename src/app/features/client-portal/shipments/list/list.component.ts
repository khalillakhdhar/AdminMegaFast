import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { ClientShipmentService } from '../../../../core/services/client-shipment.service';
import { Shipment } from '../../../../core/models/shipment.model';

@Component({
  selector: 'app-shipments-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ShipmentsListComponent implements OnInit {

  shipments: Shipment[] = [];
  filteredShipments: Shipment[] = [];
  searchTerm: string = '';
  statusFilter: string = '';
  expandedShipment: string | null = null;

  constructor(
    private clientShipmentService: ClientShipmentService
  ) {}

  ngOnInit(): void {
    this.loadShipments();
  }

  private loadShipments(): void {
    this.clientShipmentService.getClientShipments(100).subscribe({
      next: (shipments) => {
        this.shipments = shipments;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des colis:', error);
      }
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.shipments];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(shipment =>
        shipment.barcode?.toLowerCase().includes(term) ||
        shipment.clientName?.toLowerCase().includes(term) ||
        shipment.city?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (this.statusFilter) {
      filtered = filtered.filter(shipment => shipment.status === this.statusFilter);
    }

    this.filteredShipments = filtered;
  }

  trackShipment(shipment: Shipment): void {
    // Implementation for tracking modal or navigation
    console.log('Tracking shipment:', shipment.barcode);
  }

  getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      created: 'Créé',
      assigned: 'Assigné',
      in_transit: 'En Transit',
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

  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      created: 'secondary',
      assigned: 'warning',
      in_transit: 'info',
      delivered: 'success',
      returned: 'danger',
      canceled: 'dark'
    };
    return statusColors[status] || 'secondary';
  }

  trackByShipmentId(index: number, shipment: Shipment): string {
    return shipment.id || index.toString();
  }

  toggleExpand(shipmentId: string): void {
    this.expandedShipment = this.expandedShipment === shipmentId ? null : shipmentId;
  }

  viewDetails(shipment: Shipment): void {
    // Implementation for details modal or navigation
    console.log('Viewing details for shipment:', shipment.barcode);
    // Could navigate to details page or open modal
  }

  getShipmentMeta(shipment: Shipment): any {
    // Try to extract metadata from notes field with META: prefix
    if (shipment.notes && shipment.notes.includes('META:')) {
      try {
        const metaStart = shipment.notes.indexOf('META:') + 5;
        const metaString = shipment.notes.substring(metaStart);
        return JSON.parse(metaString);
      } catch (e) {
        console.warn('Failed to parse shipment metadata:', e);
      }
    }

    // Return empty meta structure
    return {
      items: [],
      fees: null,
      subtotal: 0,
      grandTotal: shipment.amount || 0
    };
  }
}
