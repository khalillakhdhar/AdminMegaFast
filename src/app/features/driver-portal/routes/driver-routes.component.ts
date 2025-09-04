import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-driver-routes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="driver-routes">
      <div class="page-header">
        <h1>Itinéraires</h1>
        <p>Optimisez vos trajets de livraison</p>
      </div>

      <div class="coming-soon">
        <i class="fas fa-route"></i>
        <h2>Fonctionnalité en développement</h2>
        <p>L'optimisation d'itinéraires sera bientôt disponible</p>
      </div>
    </div>
  `,
  styles: [`
    .driver-routes {
      .page-header {
        margin-bottom: 24px;
        padding: 24px;
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
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
          color: #8b5cf6;
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
export class DriverRoutesComponent {}
