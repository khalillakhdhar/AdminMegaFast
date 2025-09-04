import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

import { Client } from '../../../../core/models/client.model';
import { ClientService } from '../../../../core/services/client.service';
import { PageTitleComponent } from '../../../../shared/ui/pagetitle/pagetitle.component';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  newClientsThisMonth: number;
  totalRevenue: number;
  avgOrderValue: number;
  clientsGrowth: number;
  revenueGrowth: number;
}

interface ChartData {
  months: string[];
  newClients: number[];
  revenue: number[];
  orders: number[];
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgApexchartsModule,
    PageTitleComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class ClientDashboardComponent implements OnInit {
  // Breadcrumb
  breadCrumbItems = [
    { label: 'Clients', active: true },
    { label: 'Tableau de bord', active: true }
  ];

  // Data
  stats?: DashboardStats;
  chartData?: ChartData;
  loading = false;

  // Charts
  clientsGrowthChart: any = {};
  revenueChart: any = {};
  ordersChart: any = {};

  constructor(
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    
    this.clientService.list({ limit: 1000 }).subscribe({
      next: (clients) => {
        this.calculateStats(clients);
        this.generateChartData();
        this.setupCharts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.loading = false;
      }
    });
  }

  calculateStats(clients: Client[]): void {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newClientsThisMonth = clients.filter(client => {
      const createdAt = client.createdAt?.toDate?.() || new Date(client.createdAt);
      return createdAt >= thisMonth;
    }).length;

    const newClientsLastMonth = clients.filter(client => {
      const createdAt = client.createdAt?.toDate?.() || new Date(client.createdAt);
      return createdAt >= lastMonth && createdAt < thisMonth;
    }).length;

    const activeClients = clients.filter(client => client.isActive !== false).length;

    // Mock revenue data - à remplacer par des vraies données
    const totalRevenue = Math.floor(Math.random() * 500000) + 100000;
    const avgOrderValue = Math.floor(Math.random() * 1000) + 200;
    
    const clientsGrowth = newClientsLastMonth > 0 
      ? ((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100 
      : 0;
    
    const revenueGrowth = Math.floor(Math.random() * 30) - 15; // Mock growth

    this.stats = {
      totalClients: clients.length,
      activeClients,
      newClientsThisMonth,
      totalRevenue,
      avgOrderValue,
      clientsGrowth,
      revenueGrowth
    };
  }

  generateChartData(): void {
    const months = [];
    const newClients = [];
    const revenue = [];
    const orders = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }));
      newClients.push(Math.floor(Math.random() * 50) + 10);
      revenue.push(Math.floor(Math.random() * 50000) + 10000);
      orders.push(Math.floor(Math.random() * 200) + 50);
    }

    this.chartData = { months, newClients, revenue, orders };
  }

  setupCharts(): void {
    if (!this.chartData) return;

    // Clients Growth Chart
    this.clientsGrowthChart = {
      series: [{
        name: 'Nouveaux Clients',
        data: this.chartData.newClients
      }],
      chart: {
        type: 'area',
        height: 350,
        toolbar: { show: false }
      },
      colors: ['#556ee6'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3
        }
      },
      xaxis: {
        categories: this.chartData.months
      },
      yaxis: {
        title: { text: 'Nombre de clients' }
      },
      stroke: {
        curve: 'smooth',
        width: 2
      },
      grid: {
        borderColor: '#f1f1f1'
      }
    };

    // Revenue Chart
    this.revenueChart = {
      series: [{
        name: 'Chiffre d\'affaires',
        data: this.chartData.revenue
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false }
      },
      colors: ['#34c38f'],
      xaxis: {
        categories: this.chartData.months
      },
      yaxis: {
        title: { text: 'Montant (TND)' },
        labels: {
          formatter: (value: number) => this.formatCurrency(value)
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '60%'
        }
      },
      grid: {
        borderColor: '#f1f1f1'
      }
    };

    // Orders Chart
    this.ordersChart = {
      series: [{
        name: 'Commandes',
        data: this.chartData.orders
      }],
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false }
      },
      colors: ['#f1734f'],
      xaxis: {
        categories: this.chartData.months
      },
      yaxis: {
        title: { text: 'Nombre de commandes' }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      markers: {
        size: 6
      },
      grid: {
        borderColor: '#f1f1f1'
      }
    };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0
    }).format(value);
  }

  formatPercentage(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  getGrowthClass(value: number): string {
    return value >= 0 ? 'text-success' : 'text-danger';
  }

  getGrowthIcon(value: number): string {
    return value >= 0 ? 'bx-trending-up' : 'bx-trending-down';
  }
}
