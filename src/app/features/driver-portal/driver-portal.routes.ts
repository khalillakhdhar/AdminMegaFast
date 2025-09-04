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
    path: 'batches',
    loadComponent: () => import('./batches/driver-batches.component').then(m => m.DriverBatchesComponent)
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
    path: 'history',
    loadComponent: () => import('./history/driver-history.component').then(m => m.DriverHistoryComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/driver-profile.component').then(m => m.DriverProfileComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/driver-settings.component').then(m => m.DriverSettingsComponent)
  }
];
