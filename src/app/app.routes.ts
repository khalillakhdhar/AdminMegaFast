import { Routes } from '@angular/router';
import { LayoutComponent } from './layouts/layout.component';
import { ClientLayoutComponent } from './layouts/client-layout/client-layout.component';
import { DriverLayoutComponent } from './layouts/driver-layout.component';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { ClientGuard } from './core/guards/client.guard';
import { DriverGuard } from './core/guards/driver.guard';
import { MEGAFAST_ROUTES } from './features/megafast/megafast.routes';
import { CLIENT_PORTAL_ROUTES } from './features/client-portal/client-portal.routes';
import { DRIVER_PORTAL_ROUTES } from './features/driver-portal/driver-portal.routes';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./account/account.module').then(m => m.AccountModule),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard, AdminGuard],
    children: [
      { path: '', redirectTo: 'megafast', pathMatch: 'full' },
      { path: 'megafast', children: MEGAFAST_ROUTES },

      // utility pages
      { path: 'pages', loadChildren: () => import('./extrapages/extrapages.module').then(m => m.ExtrapagesModule) },
    ],
  },
  {
    path: 'client',
    component: ClientLayoutComponent,
    canActivate: [AuthGuard, ClientGuard],
    children: CLIENT_PORTAL_ROUTES,
  },
  {
    path: 'driver',
    component: DriverLayoutComponent,
    canActivate: [AuthGuard, DriverGuard],
    children: DRIVER_PORTAL_ROUTES,
  },
];
