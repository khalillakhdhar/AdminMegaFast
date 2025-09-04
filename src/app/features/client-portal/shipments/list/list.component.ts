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
}
