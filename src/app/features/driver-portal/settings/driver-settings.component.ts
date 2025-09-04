import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-driver-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="driver-settings">
      <div class="page-header">
        <h1>Paramètres</h1>
        <p>Configurez vos préférences</p>
      </div>

      <div class="coming-soon">
        <i class="fas fa-cog"></i>
        <h2>Paramètres</h2>
        <p>Les paramètres seront bientôt disponibles</p>
      </div>
    </div>
  `,
  styles: [`
    .driver-settings {
      .page-header {
        margin-bottom: 24px;
        padding: 24px;
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
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
          color: #6b7280;
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
export class DriverSettingsComponent {}
