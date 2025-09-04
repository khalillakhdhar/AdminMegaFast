import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

export interface PieChartData {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

@Component({
  selector: 'app-pie-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pie-chart-container">
      <div class="pie-chart">
        <svg viewBox="0 0 42 42" class="donut">
          <circle
            class="donut-hole"
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent">
          </circle>
          <circle
            class="donut-ring"
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            stroke="#e5e7eb"
            stroke-width="3">
          </circle>

          <!-- Dynamic segments -->
          <circle
            *ngFor="let segment of segments; let i = index"
            class="donut-segment"
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            [attr.stroke]="segment.color"
            stroke-width="3"
            [attr.stroke-dasharray]="segment.strokeDasharray"
            [attr.stroke-dashoffset]="segment.strokeDashoffset"
            [style.transform]="'rotate(' + segment.rotation + 'deg)'"
            style="transform-origin: 50% 50%">
          </circle>
        </svg>

        <!-- Center text -->
        <div class="pie-center">
          <div class="center-value">{{ totalValue }}</div>
          <div class="center-label">{{ centerLabel }}</div>
        </div>
      </div>

      <!-- Legend -->
      <div class="pie-legend">
        <div class="legend-item" *ngFor="let item of data">
          <div class="legend-color" [style.background-color]="item.color"></div>
          <div class="legend-content">
            <span class="legend-label">{{ item.label }}</span>
            <span class="legend-value">{{ item.value }} ({{ item.percentage }}%)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pie-chart-container {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 1rem;
    }

    .pie-chart {
      position: relative;
      width: 120px;
      height: 120px;
      flex-shrink: 0;
    }

    .donut {
      width: 100%;
      height: 100%;
    }

    .donut-segment {
      transition: stroke-width 0.3s;
    }

    .donut-segment:hover {
      stroke-width: 4;
    }

    .pie-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
    }

    .center-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      line-height: 1;
    }

    .center-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 2px;
    }

    .pie-legend {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .legend-label {
      font-size: 0.875rem;
      color: #374151;
      font-weight: 500;
    }

    .legend-value {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .pie-chart-container {
        flex-direction: column;
        gap: 1rem;
      }

      .pie-chart {
        width: 100px;
        height: 100px;
      }

      .center-value {
        font-size: 1rem;
      }
    }
  `]
})
export class PieChartComponent implements OnChanges {
  @Input() data: PieChartData[] = [];
  @Input() centerLabel = 'Total';

  segments: any[] = [];
  totalValue = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.calculateSegments();
    }
  }

  private calculateSegments(): void {
    this.totalValue = this.data.reduce((sum, item) => sum + item.value, 0);

    if (this.totalValue === 0) {
      this.segments = [];
      return;
    }

    const circumference = 2 * Math.PI * 15.915; // 2πr
    let currentOffset = 0;

    this.segments = this.data.map(item => {
      const percentage = (item.value / this.totalValue) * 100;
      const strokeLength = (percentage / 100) * circumference;
      const strokeDasharray = `${strokeLength} ${circumference}`;
      const strokeDashoffset = currentOffset;
      const rotation = (currentOffset / circumference) * 360;

      currentOffset -= strokeLength;

      return {
        color: item.color,
        strokeDasharray,
        strokeDashoffset,
        rotation
      };
    });
  }
}
