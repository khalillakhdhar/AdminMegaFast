import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-driver-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="driver-history">
      <div class="page-header">
        <h1>Historique</h1>
        <p>Consultez l'historique de vos livraisons</p>
      </div>

      <div class="coming-soon">
        <i class="fas fa-history"></i>
        <h2>Historique des livraisons</h2>
        <p>Cette fonctionnalité sera bientôt disponible</p>
      </div>
    </div>
  `,
  styles: [`
    .driver-history {
      .page-header {
        margin-bottom: 24px;
        padding: 24px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
          color: #10b981;
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
export class DriverHistoryComponent {}
