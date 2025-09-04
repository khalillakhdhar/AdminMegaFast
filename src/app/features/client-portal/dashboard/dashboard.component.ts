import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { ClientShipmentService } from '../../../core/services/client-shipment.service';
import { Shipment } from '../../../core/models/shipment.model';
import { TUNISIA_CITIES } from '../../../shared/data/tunisia-cities';

interface QuickShipment {
  departure: string;
  arrival: string;
  recipientName: string;
  recipientPhone: string;
  value: number;
  description: string;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit {

  stats$!: Observable<any>;
  recentShipments$!: Observable<Shipment[]>;

  // Villes de Tunisie
  tunisiaCities = TUNISIA_CITIES;

  // Formulaire de création rapide
  quickShipment: QuickShipment = {
    departure: '',
    arrival: '',
    recipientName: '',
    recipientPhone: '',
    value: 0,
    description: ''
  };

  constructor(
    private readonly clientShipmentService: ClientShipmentService
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentShipments();
  }

  private loadStats(): void {
    this.stats$ = this.clientShipmentService.getClientStats();
  }

  private loadRecentShipments(): void {
    this.recentShipments$ = this.clientShipmentService.getClientShipments(5);
  }

  // Méthodes pour la création rapide d'envoi
  isQuickShipmentValid(): boolean {
    return !!(
      this.quickShipment.departure &&
      this.quickShipment.arrival &&
      this.quickShipment.recipientName &&
      this.quickShipment.recipientPhone &&
      this.quickShipment.description &&
      this.quickShipment.value > 0
    );
  }

  createQuickShipment(): void {
    if (!this.isQuickShipmentValid()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Ici, vous pouvez appeler votre service pour créer l'envoi
    console.log('Création de l\'envoi:', this.quickShipment);

    // Réinitialiser le formulaire après création
    this.quickShipment = {
      departure: '',
      arrival: '',
      recipientName: '',
      recipientPhone: '',
      value: 0,
      description: ''
    };

    alert('Envoi créé avec succès !');
  }

  getEstimatedDelivery(): string {
    if (!this.quickShipment.departure || !this.quickShipment.arrival) {
      return '';
    }

    // Calcul simple basé sur la distance entre villes
    const sameDepartmentCities = ['Tunis', 'Ariana', 'Ben Arous', 'Manouba'];
    const isDepartureTunis = sameDepartmentCities.includes(this.quickShipment.departure);
    const isArrivalTunis = sameDepartmentCities.includes(this.quickShipment.arrival);

    if (isDepartureTunis && isArrivalTunis) {
      return '24h';
    } else if (this.quickShipment.departure === this.quickShipment.arrival) {
      return '12h';
    } else {
      return '48h';
    }
  }

  getEstimatedCost(): string {
    if (!this.quickShipment.departure || !this.quickShipment.arrival) {
      return '0';
    }

    const basePrice = 8; // Prix de base en TND
    const value = this.quickShipment.value || 0;
    const valueFee = value * 0.02; // 2% de la valeur

    return (basePrice + valueFee).toFixed(2);
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
