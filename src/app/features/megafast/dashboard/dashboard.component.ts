import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, forkJoin, of } from "rxjs";
import { takeUntil, catchError, map } from "rxjs/operators";

import { PageTitleComponent } from "../../../shared/ui/pagetitle/pagetitle.component";
import { ShipmentService } from "../../../core/services/shipment.service";
import { DriverService } from "../../../core/services/driver.service";
import { Shipment } from "../../../core/models/shipment.model";
import { Driver } from "../../../core/models/driver.model";
import { ToastrService } from "ngx-toastr";

interface DashboardStats {
  totalShipments: number;
  shipmentGrowth: number;
  deliveryRate: number;
  deliveryRateImprovement: number;
  totalCOD: number;
  codGrowth: number;
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
  type: "shipment" | "delivery" | "return";
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
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule, PageTitleComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  breadCrumbItems = [
    { label: "MegaFast", active: false },
    { label: "Dashboard", active: true },
  ];

  selectedPeriod = "30";

  dashboardStats: DashboardStats = {
    totalShipments: 0,
    shipmentGrowth: 0,
    deliveryRate: 0,
    deliveryRateImprovement: 0,
    totalCOD: 0,
    codGrowth: 0,
    driversActive: 0,
  };

  statusDistribution: StatusDistribution = {
    delivered: 0,
    inTransit: 0,
    pending: 0,
    returned: 0,
  };

  recentActivities: Activity[] = [];
  topDrivers: TopDriver[] = [];
  isLoading = true;

  // Store raw data for calculations
  private allShipments: Shipment[] = [];
  private allDrivers: Driver[] = [];

  constructor(
    public router: Router,
    private readonly shipmentService: ShipmentService,
    private readonly driverService: DriverService,
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
    this.isLoading = true;

    // Load real data from Firestore
    forkJoin({
      shipments: this.shipmentService.list({ limit: 500 }).pipe(
        catchError((err) => {
          console.error("Error loading shipments:", err);
          return of([]);
        })
      ),
      drivers: this.driverService.getAll().pipe(
        catchError((err) => {
          console.error("Error loading drivers:", err);
          return of([]);
        })
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ shipments, drivers }) => {
          this.allShipments = shipments;
          this.allDrivers = drivers;

          this.calculateStats(shipments, drivers);
          this.calculateStatusDistribution(shipments);
          this.generateRecentActivities(shipments);
          this.updateTopDrivers(drivers, shipments);

          this.isLoading = false;
          if (shipments.length > 0 || drivers.length > 0) {
            this.toastrService.success(
              `Tableau de bord chargé: ${shipments.length} colis, ${drivers.length} livreurs`
            );
          } else {
            this.toastrService.info(
              "Aucune donnée trouvée. Commencez par créer des colis et des livreurs."
            );
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.toastrService.error("Erreur lors du chargement des données");
          console.error("Dashboard load error:", err);
        },
      });
  }

  private calculateStats(shipments: Shipment[], drivers: Driver[]): void {
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    // Helper to convert Firebase Timestamp or Date
    const toDate = (val: any): Date => {
      if (!val) return new Date(0);
      if (val.toDate) return val.toDate(); // Firebase Timestamp
      return new Date(val);
    };

    // Shipments this month vs last month
    const shipmentsThisMonth = shipments.filter(
      (s) => toDate(s.createdAt) >= lastMonth
    );
    const shipmentsLastMonth = shipments.filter((s) => {
      const date = toDate(s.createdAt);
      const twoMonthsAgo = new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        now.getDate()
      );
      return date >= twoMonthsAgo && date < lastMonth;
    });

    this.dashboardStats = {
      totalShipments: shipments.length,
      shipmentGrowth: this.calculateGrowthPercentage(
        shipmentsThisMonth.length,
        shipmentsLastMonth.length
      ),
      deliveryRate: this.calculateDeliveryRate(shipments),
      deliveryRateImprovement: this.calculateDeliveryRateImprovement(shipments),
      totalCOD: this.calculateTotalCOD(shipments),
      codGrowth: this.calculateCODGrowth(shipments),
      driversActive: drivers.filter((d) => d.active || d.isActive).length,
    };
  }

  private calculateStatusDistribution(shipments: Shipment[]): void {
    const total = shipments.length;
    if (total === 0) {
      this.statusDistribution = {
        delivered: 0,
        inTransit: 0,
        pending: 0,
        returned: 0,
      };
      return;
    }

    const counts = shipments.reduce(
      (acc, shipment) => {
        const status = shipment.status;
        if (status === "delivered") acc.delivered++;
        else if (status === "in_transit" || status === "assigned")
          acc.inTransit++;
        else if (status === "created") acc.pending++;
        else if (status === "returned" || status === "canceled") acc.returned++;
        return acc;
      },
      { delivered: 0, inTransit: 0, pending: 0, returned: 0 }
    );

    this.statusDistribution = {
      delivered: Math.round((counts.delivered / total) * 100),
      inTransit: Math.round((counts.inTransit / total) * 100),
      pending: Math.round((counts.pending / total) * 100),
      returned: Math.round((counts.returned / total) * 100),
    };
  }

  private generateRecentActivities(shipments: Shipment[]): void {
    const activities: Activity[] = [];

    // Helper to convert Firebase Timestamp or Date
    const toDate = (val: any): Date => {
      if (!val) return new Date(0);
      if (val.toDate) return val.toDate();
      return new Date(val);
    };

    // Recent shipment activities based on history
    shipments
      .filter((s) => s.history && s.history.length > 0)
      .sort(
        (a, b) => toDate(b.updatedAt).getTime() - toDate(a.updatedAt).getTime()
      )
      .slice(0, 8)
      .forEach((shipment) => {
        const lastStatus = shipment.history![shipment.history!.length - 1];
        activities.push({
          id: `shipment-${shipment.id}`,
          type: this.getActivityType(lastStatus.status),
          title: `Colis ${shipment.barcode}`,
          description: this.getStatusDescription(lastStatus.status),
          timestamp: toDate(lastStatus.at),
        });
      });

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.recentActivities = activities.slice(0, 8);
  }

  private updateTopDrivers(drivers: Driver[], shipments: Shipment[]): void {
    // Calculate driver stats from shipments
    const driverStats = new Map<string, { deliveries: number; cod: number }>();

    shipments.forEach((s) => {
      if (s.assignedTo && s.status === "delivered") {
        const stats = driverStats.get(s.assignedTo) || {
          deliveries: 0,
          cod: 0,
        };
        stats.deliveries++;
        stats.cod += (s as any).codAmount || (s as any).amount || 0;
        driverStats.set(s.assignedTo, stats);
      }
    });

    this.topDrivers = drivers
      .map((driver) => {
        const stats = driverStats.get(driver.id || "") || {
          deliveries: 0,
          cod: 0,
        };
        const totalAssigned = shipments.filter(
          (s) => s.assignedTo === driver.id
        ).length;
        const rate =
          totalAssigned > 0
            ? Math.round((stats.deliveries / totalAssigned) * 100)
            : 0;

        return {
          id: driver.id || "",
          name: driver.displayName || driver.name,
          deliveries: stats.deliveries,
          rate: rate,
          cod: stats.cod,
        };
      })
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, 5);
  }

  private calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private calculateDeliveryRate(shipments: Shipment[]): number {
    const totalShipments = shipments.length;
    if (totalShipments === 0) return 0;

    const deliveredShipments = shipments.filter(
      (s) => s.status === "delivered"
    ).length;
    return Math.round((deliveredShipments / totalShipments) * 100);
  }

  private calculateDeliveryRateImprovement(shipments: Shipment[]): number {
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const twoMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      now.getDate()
    );

    // Helper to convert Firebase Timestamp or Date
    const toDate = (val: any): Date => {
      if (!val) return new Date(0);
      if (val.toDate) return val.toDate();
      return new Date(val);
    };

    const currentMonthShipments = shipments.filter(
      (s) => toDate(s.createdAt) >= lastMonth
    );
    const lastMonthShipments = shipments.filter((s) => {
      const date = toDate(s.createdAt);
      return date >= twoMonthsAgo && date < lastMonth;
    });

    const currentRate = this.calculateDeliveryRate(currentMonthShipments);
    const lastRate = this.calculateDeliveryRate(lastMonthShipments);

    return Math.round(currentRate - lastRate);
  }

  private calculateTotalCOD(shipments: Shipment[]): number {
    return shipments
      .filter((s) => s.status === "delivered")
      .reduce(
        (total, s) => total + ((s as any).codAmount || (s as any).amount || 0),
        0
      );
  }

  private calculateCODGrowth(shipments: Shipment[]): number {
    const now = new Date();
    const lastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );
    const twoMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      now.getDate()
    );

    // Helper to convert Firebase Timestamp or Date
    const toDate = (val: any): Date => {
      if (!val) return new Date(0);
      if (val.toDate) return val.toDate();
      return new Date(val);
    };

    const currentMonthCOD = this.calculateTotalCOD(
      shipments.filter((s) => toDate(s.createdAt) >= lastMonth)
    );
    const lastMonthCOD = this.calculateTotalCOD(
      shipments.filter((s) => {
        const date = toDate(s.createdAt);
        return date >= twoMonthsAgo && date < lastMonth;
      })
    );

    return this.calculateGrowthPercentage(currentMonthCOD, lastMonthCOD);
  }

  updateCharts(): void {
    // Reload data based on selected period
    this.loadDashboardData();
  }

  optimizeAllRoutes(): void {
    this.toastrService.info("Optimisation des routes en cours...");

    // Mock optimization process
    setTimeout(() => {
      this.toastrService.success("Routes optimisées avec succès!");
    }, 2000);
  }

  generateReport(): void {
    this.toastrService.info("Génération du rapport en cours...");

    // Mock report generation
    setTimeout(() => {
      this.toastrService.success("Rapport téléchargé avec succès!");
    }, 1500);
  }

  // Utility methods for template
  getActivityType(status: string): Activity["type"] {
    if (status === "delivered") return "delivery";
    if (status === "returned" || status === "canceled") return "return";
    return "shipment";
  }

  getActivityIconClass(type: Activity["type"]): string {
    const classes = {
      shipment: "bg-primary-subtle text-primary",
      delivery: "bg-success-subtle text-success",
      return: "bg-danger-subtle text-danger",
    };
    return classes[type] || "bg-secondary-subtle text-secondary";
  }

  getActivityIcon(type: Activity["type"]): string {
    const icons = {
      shipment: "bx bx-package",
      delivery: "bx bx-check-circle",
      return: "bx bx-x-circle",
    };
    return icons[type] || "bx bx-info-circle";
  }

  getStatusDescription(status: string): string {
    const descriptions: { [key: string]: string } = {
      created: "En attente de traitement",
      assigned: "Affecté à un livreur",
      in_transit: "En transit",
      delivered: "Livré avec succès",
      returned: "Retourné à l'expéditeur",
      canceled: "Annulé",
    };
    return descriptions[status] || status;
  }

  getDriverInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase();
  }

  getPerformanceBadgeClass(rate: number): string {
    if (rate >= 95) return "badge-soft-success";
    if (rate >= 90) return "badge-soft-warning";
    return "badge-soft-danger";
  }

  // TrackBy functions for performance
  trackByActivity(index: number, activity: Activity): string {
    return activity.id;
  }

  trackByDriver(index: number, driver: TopDriver): string {
    return driver.id;
  }
}
