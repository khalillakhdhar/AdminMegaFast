import { Routes } from '@angular/router';

export const DRIVER_PORTAL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/driver-dashboard.component').then(m => m.DriverDashboardComponent)
  },
  {
    path: 'shipments',
    loadComponent: () => import('./shipments/driver-shipments.component').then(m => m.DriverShipmentsComponent)
  },
  {
    path: 'routes',
    loadComponent: () => import('./routes/driver-routes.component').then(m => m.DriverRoutesComponent)
  },
  {
    path: 'statistics',
    loadComponent: () => import('./statistics/driver-statistics.component').then(m => m.DriverStatisticsComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/driver-profile.component').then(m => m.DriverProfileComponent)
  },
  {
    path: 'delivery',
    loadComponent: () => import('../delivery/delivery.component').then(m => m.DeliveryComponent)
  }
];
