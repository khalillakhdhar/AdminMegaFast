import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';


import { PageTitleComponent } from '../../../shared/ui/pagetitle/pagetitle.component';
import { ShipmentService } from '../../../core/services/shipment.service';
import { BatchService } from '../../../core/services/batch.service';
import { ToastrService } from 'ngx-toastr';

interface DashboardStats {
  totalShipments: number;
  shipmentGrowth: number;
  deliveryRate: number;
  deliveryRateImprovement: number;
  totalCOD: number;
  codGrowth: number;
  activeBatches: number;
  driversActive: number;
}

interface StatusDistribution {
  delivered: number;
  inTransit: number;
  pending: number;
  returned: number;
}

interface Activity {
  id: string;
  type: 'shipment' | 'batch' | 'delivery' | 'return';
  title: string;
  description: string;
  timestamp: Date;
}

interface TopDriver {
  id: string;
  name: string;
  deliveries: number;
  rate: number;
  cod: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageTitleComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  breadCrumbItems = [
    { label: 'MegaFast', active: false },
    { label: 'Dashboard', active: true }
  ];

  selectedPeriod = '30';

  dashboardStats: DashboardStats = {
    totalShipments: 0,
    shipmentGrowth: 0,
    deliveryRate: 0,
    deliveryRateImprovement: 0,
    totalCOD: 0,
    codGrowth: 0,
    activeBatches: 0,
    driversActive: 0
  };

  statusDistribution: StatusDistribution = {
    delivered: 0,
    inTransit: 0,
    pending: 0,
    returned: 0
  };

  recentActivities: Activity[] = [];
  topDrivers: TopDriver[] = [];

  constructor(
    public router: Router,
    private readonly shipmentService: ShipmentService,
    private readonly batchService: BatchService,
    private readonly toastrService: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    // For now, generate mock data since service methods don't exist yet
    const mockShipments: any[] = [];
    const mockBatches: any[] = [];
    const mockDrivers: any[] = [];

    this.calculateStats(mockShipments, mockBatches, mockDrivers);
    this.calculateStatusDistribution(mockShipments);
    this.generateRecentActivities(mockShipments, mockBatches);
    this.updateTopDrivers(mockDrivers);

    this.toastrService.info('Données du tableau de bord chargées');
  }

  private calculateStats(shipments: any[], batches: any[], drivers: any[]): void {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // Shipments this month vs last month
    const shipmentsThisMonth = shipments.filter(s => new Date(s.createdAt) >= lastMonth);
    const shipmentsLastMonth = shipments.filter(s => {
      const date = new Date(s.createdAt);
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
      return date >= twoMonthsAgo && date < lastMonth;
    });

    this.dashboardStats = {
      totalShipments: shipments.length,
      shipmentGrowth: this.calculateGrowthPercentage(shipmentsThisMonth.length, shipmentsLastMonth.length),
      deliveryRate: this.calculateDeliveryRate(shipments),
      deliveryRateImprovement: this.calculateDeliveryRateImprovement(shipments),
      totalCOD: this.calculateTotalCOD(shipments),
      codGrowth: this.calculateCODGrowth(shipments),
      activeBatches: batches.filter(b => ['in_progress', 'assigned'].includes(b.status)).length,
      driversActive: drivers.filter(d => d.status === 'active').length
    };
  }

  private calculateStatusDistribution(shipments: any[]): void {
    const total = shipments.length;
    if (total === 0) {
      this.statusDistribution = { delivered: 0, inTransit: 0, pending: 0, returned: 0 };
      return;
    }

    const counts = shipments.reduce((acc, shipment) => {
      const status = shipment.status;
      if (status === 'delivered') acc.delivered++;
      else if (['in_transit', 'out_for_delivery'].includes(status)) acc.inTransit++;
      else if (['pending', 'confirmed'].includes(status)) acc.pending++;
      else if (['returned', 'cancelled'].includes(status)) acc.returned++;
      return acc;
    }, { delivered: 0, inTransit: 0, pending: 0, returned: 0 });

    this.statusDistribution = {
      delivered: Math.round((counts.delivered / total) * 100),
      inTransit: Math.round((counts.inTransit / total) * 100),
      pending: Math.round((counts.pending / total) * 100),
      returned: Math.round((counts.returned / total) * 100)
    };
  }

  private generateRecentActivities(shipments: any[], batches: any[]): void {
    const activities: Activity[] = [];

    // Recent shipment activities
    shipments
      .filter(s => s.statusHistory && s.statusHistory.length > 0)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .forEach(shipment => {
        const lastStatus = shipment.statusHistory[shipment.statusHistory.length - 1];
        activities.push({
          id: `shipment-${shipment.id}`,
          type: this.getActivityType(lastStatus.status),
          title: `Colis ${shipment.trackingNumber}`,
          description: this.getStatusDescription(lastStatus.status),
          timestamp: new Date(lastStatus.timestamp)
        });
      });

    // Recent batch activities
    const sortedBatches = [...batches];
    sortedBatches.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    sortedBatches
      .slice(0, 3)
      .forEach(batch => {
        activities.push({
          id: `batch-${batch.id}`,
          type: 'batch',
          title: `Lot ${batch.name}`,
          description: `${batch.shipments?.length || 0} colis assignés`,
          timestamp: new Date(batch.updatedAt)
        });
      });

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.recentActivities = activities.slice(0, 8);
  }

  private updateTopDrivers(drivers: any[]): void {
    this.topDrivers = drivers
      .map(driver => ({
        id: driver.id,
        name: driver.name,
        deliveries: driver.deliveredShipments || 0,
        rate: driver.successRate || 0,
        cod: driver.collectedCOD || 0
      }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);
  }

  private calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private calculateDeliveryRate(shipments: any[]): number {
    const totalShipments = shipments.length;
    if (totalShipments === 0) return 0;

    const deliveredShipments = shipments.filter(s => s.status === 'delivered').length;
    return Math.round((deliveredShipments / totalShipments) * 100);
  }

  private calculateDeliveryRateImprovement(shipments: any[]): number {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    const currentMonthShipments = shipments.filter(s => new Date(s.createdAt) >= lastMonth);
    const lastMonthShipments = shipments.filter(s => {
      const date = new Date(s.createdAt);
      return date >= twoMonthsAgo && date < lastMonth;
    });

    const currentRate = this.calculateDeliveryRate(currentMonthShipments);
    const lastRate = this.calculateDeliveryRate(lastMonthShipments);

    return Math.round(currentRate - lastRate);
  }

  private calculateTotalCOD(shipments: any[]): number {
    return shipments
      .filter(s => s.status === 'delivered' && s.codAmount)
      .reduce((total, s) => total + (s.codAmount || 0), 0);
  }

  private calculateCODGrowth(shipments: any[]): number {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

    const currentMonthCOD = this.calculateTotalCOD(
      shipments.filter(s => new Date(s.createdAt) >= lastMonth)
    );
    const lastMonthCOD = this.calculateTotalCOD(
      shipments.filter(s => {
        const date = new Date(s.createdAt);
        return date >= twoMonthsAgo && date < lastMonth;
      })
    );

    return this.calculateGrowthPercentage(currentMonthCOD, lastMonthCOD);
  }

  private getDriversData(): Observable<any[]> {
    // Mock data for drivers - replace with actual service call
    return new Observable(observer => {
      const mockDrivers = [
        { id: '1', name: 'Ahmed Ben Ali', status: 'active', deliveredShipments: 125, successRate: 96, collectedCOD: 2500 },
        { id: '2', name: 'Mohamed Trabelsi', status: 'active', deliveredShipments: 98, successRate: 94, collectedCOD: 1950 },
        { id: '3', name: 'Karim Sassi', status: 'active', deliveredShipments: 87, successRate: 92, collectedCOD: 1780 },
        { id: '4', name: 'Slim Bouazizi', status: 'active', deliveredShipments: 76, successRate: 89, collectedCOD: 1560 },
        { id: '5', name: 'Nabil Gharbi', status: 'active', deliveredShipments: 65, successRate: 91, collectedCOD: 1340 }
      ];
      observer.next(mockDrivers);
      observer.complete();
    });
  }

  updateCharts(): void {
    // Reload data based on selected period
    this.loadDashboardData();
  }

  optimizeAllRoutes(): void {
    this.toastrService.info('Optimisation des routes en cours...');

    // Mock optimization process
    setTimeout(() => {
      this.toastrService.success('Routes optimisées avec succès!');
    }, 2000);
  }

  generateReport(): void {
    this.toastrService.info('Génération du rapport en cours...');

    // Mock report generation
    setTimeout(() => {
      this.toastrService.success('Rapport téléchargé avec succès!');
    }, 1500);
  }

  // Utility methods for template
  getActivityType(status: string): Activity['type'] {
    if (status === 'delivered') return 'delivery';
    if (status === 'returned') return 'return';
    return 'shipment';
  }

  getActivityIconClass(type: Activity['type']): string {
    const classes = {
      'shipment': 'bg-primary-subtle text-primary',
      'batch': 'bg-success-subtle text-success',
      'delivery': 'bg-success-subtle text-success',
      'return': 'bg-danger-subtle text-danger'
    };
    return classes[type] || 'bg-secondary-subtle text-secondary';
  }

  getActivityIcon(type: Activity['type']): string {
    const icons = {
      'shipment': 'bx bx-package',
      'batch': 'bx bx-list-ul',
      'delivery': 'bx bx-check-circle',
      'return': 'bx bx-x-circle'
    };
    return icons[type] || 'bx bx-info-circle';
  }

  getStatusDescription(status: string): string {
    const descriptions: { [key: string]: string } = {
      'pending': 'En attente de traitement',
      'confirmed': 'Confirmé',
      'in_transit': 'En transit',
      'out_for_delivery': 'En cours de livraison',
      'delivered': 'Livré avec succès',
      'returned': 'Retourné à l\'expéditeur',
      'cancelled': 'Annulé'
    };
    return descriptions[status] || status;
  }

  getDriverInitials(name: string): string {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase();
  }

  getPerformanceBadgeClass(rate: number): string {
    if (rate >= 95) return 'badge-soft-success';
    if (rate >= 90) return 'badge-soft-warning';
    return 'badge-soft-danger';
  }

  // TrackBy functions for performance
  trackByActivity(index: number, activity: Activity): string {
    return activity.id;
  }

  trackByDriver(index: number, driver: TopDriver): string {
    return driver.id;
  }
}
