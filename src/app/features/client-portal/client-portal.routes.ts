import { Routes } from '@angular/router';
import { ClientDashboardComponent } from './dashboard/dashboard.component';
import { ClientProfileComponent } from './profile/profile.component';
import { ShipmentsCreateComponent } from './shipments/create/create.component';
import { ShipmentsListComponent } from './shipments/list/list.component';
import { ShipmentsTrackComponent } from './shipments/track/track.component';

export const CLIENT_PORTAL_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'dashboard', component: ClientDashboardComponent },

  { path: 'shipments', component: ShipmentsListComponent },
  { path: 'shipments/create', component: ShipmentsCreateComponent },
  { path: 'shipments/track', component: ShipmentsTrackComponent },

  { path: 'profile', component: ClientProfileComponent },
];
