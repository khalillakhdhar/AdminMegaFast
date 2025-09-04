import { Routes } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard.component';

import { ColisListComponent } from './colis/list/list.component';
import { CreateComponent as ColisCreateComponent } from './colis/create/create.component';
import { ColisDetailComponent } from './colis/detail/detail.component';

import { ListComponent as ClientsListComponent } from './clients/list/list.component';
import { DetailComponent as ClientsDetailComponent } from './clients/detail/detail.component';
import { ClientDashboardComponent } from './clients/dashboard/dashboard.component';

import { ListComponent as DriversListComponent } from './drivers/list/list.component';
import { CreateComponent as DriversCreateComponent } from './drivers/create/create.component';
import { DetailComponent as DriversDetailComponent } from './drivers/detail/detail.component';

import { BatchesListComponent } from './batches/list/list.component';
import { CreateComponent as BatchesCreateComponent } from './batches/create/create.component';
import { DetailComponent as BatchesDetailComponent } from './batches/detail/detail.component';

import { CategoriesListComponent } from './leaves/categories-list/categories-list.component';
import { RequestsListComponent } from './leaves/requests-list/requests-list.component';
import { CalendarComponent as LeaveCalendarComponent } from './leaves/calendar/calendar.component';

import { FacturesComponent } from './facturation/factures/factures.component';
import { ComptabiliteComponent } from './comptabilite/comptabilite/comptabilite.component';
import { PaieComponent } from './paie/paie/paie.component';

import { StatsComponent } from './stats/stats/stats.component';

export const MEGAFAST_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  { path: 'dashboard', component: DashboardComponent },

  { path: 'colis', component: ColisListComponent },
  { path: 'colis/create', component: ColisCreateComponent },
  { path: 'colis/:id', component: ColisDetailComponent },

  { path: 'clients', component: ClientsListComponent },
  { path: 'clients/dashboard', component: ClientDashboardComponent },
  { path: 'clients/:id', component: ClientsDetailComponent },

  { path: 'drivers', component: DriversListComponent },
  { path: 'drivers/create', component: DriversCreateComponent },
  { path: 'drivers/:id', component: DriversDetailComponent },

  // Livraisons (Lots)
  { path: 'batches', component: BatchesListComponent },
  { path: 'batches/create', component: BatchesCreateComponent },
  { path: 'batches/:id', component: BatchesDetailComponent },

  // Alias FR (facultatif)
  { path: 'livraisons', redirectTo: 'batches', pathMatch: 'full' },
  { path: 'livraisons/create', redirectTo: 'batches/create', pathMatch: 'full' },
  { path: 'livraisons/:id', redirectTo: 'batches/:id', pathMatch: 'full' },

  // Congés
  { path: 'leaves/categories', component: CategoriesListComponent },
  { path: 'leaves/requests', component: RequestsListComponent },
  { path: 'leaves/calendar', component: LeaveCalendarComponent },

  // Facturation / Comptabilité / Paie / Stats
  { path: 'facturation', component: FacturesComponent },
  { path: 'comptabilite', component: ComptabiliteComponent },
  { path: 'paie', component: PaieComponent },

  { path: 'stats', component: StatsComponent },
];
