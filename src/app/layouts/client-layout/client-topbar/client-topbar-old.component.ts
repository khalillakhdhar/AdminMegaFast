import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthenticationService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { TUNISIA_CITIES } from '../../../shared/data/tunisia-cities';

@Component({
  selector: 'app-client-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-topbar.component.html',
  styleUrls: ['./client-topbar.component.scss']
})
export class ClientTopbarComponent {
  selectedCity: string = 'tunis';
  selectedDeparture: string = 'tunis';
  selectedArrival: string = 'sfax';

  // Villes de Tunisie pour les sélecteurs
  tunisiaCities = TUNISIA_CITIES.map(city => ({
    value: city.toLowerCase().replace(/\s+/g, '-'),
    label: city,
    flag: '��'
  }));

  constructor(
    private readonly authService: AuthenticationService,
    private readonly router: Router
  ) { }

  onCityChange() {
    // Logique pour changer de ville
    console.log('Ville sélectionnée:', this.selectedCity);
  }

  onDepartureChange() {
    console.log('Ville de départ:', this.selectedDeparture);
  }

  onArrivalChange() {
    console.log('Ville d\'arrivée:', this.selectedArrival);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
