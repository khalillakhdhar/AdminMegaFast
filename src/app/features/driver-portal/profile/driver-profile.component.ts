import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="driver-profile">
      <div class="page-header">
        <h1>Mon Profil</h1>
        <p>Gérez vos informations personnelles</p>
      </div>

      <div class="coming-soon">
        <i class="fas fa-user-circle"></i>
        <h2>Profil Livreur</h2>
        <p>La gestion du profil sera bientôt disponible</p>
      </div>
    </div>
  `,
  styles: [`
    .driver-profile {
      .page-header {
        margin-bottom: 24px;
        padding: 24px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        border-radius: 16px;
        color: white;

        h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        p {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }
      }

      .coming-soon {
        text-align: center;
        padding: 80px 20px;
        color: #64748b;

        i {
          font-size: 64px;
          margin-bottom: 24px;
          color: #ef4444;
        }

        h2 {
          font-size: 24px;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        p {
          font-size: 16px;
          margin: 0;
        }
      }
    }
  `]
})
export class DriverProfileComponent {}
