import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ClientSidebarComponent } from './client-sidebar/client-sidebar.component';
import { ClientTopbarComponent } from './client-topbar/client-topbar.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ClientSidebarComponent, ClientTopbarComponent],
  template: `
    <div class="layout-wrapper client-layout-wrapper d-lg-flex">
      <!-- Sidebar -->
      <app-client-sidebar class="sidebar-menu-scroll"></app-client-sidebar>

      <!-- Main Content -->
      <div class="main-content client-main-content">
        <!-- Topbar -->
        <app-client-topbar></app-client-topbar>

        <!-- Page Content -->
        <div class="page-content client-page-content">
          <div class="container-fluid">
            <router-outlet></router-outlet>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./client-layout.component.scss']
})
export class ClientLayoutComponent {
  constructor() { }
}
