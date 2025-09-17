/* eslint-disable @angular-eslint/prefer-inject */
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  badge?: number;
  isActive?: boolean;
}

@Component({
  selector: 'app-driver-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="driver-sidebar" [class.collapsed]="isCollapsed">
      <!-- Logo Section -->
      <div class="sidebar-header">
        <div class="logo">
          <img src="assets/images/logo-light.png" alt="MegaFast" class="logo-img" *ngIf="!isCollapsed">
          <img src="assets/images/logo-icon.png" alt="MF" class="logo-icon" *ngIf="isCollapsed">
        </div>
        <button
          class="collapse-btn"
          (click)="onToggle()"
          type="button"
          aria-label="Réduire la sidebar">
          <i class="fas fa-chevron-left" [class.rotated]="isCollapsed"></i>
        </button>
      </div>

      <!-- Navigation Menu -->
      <nav class="sidebar-nav">
        <div class="nav-section">
          <h3 class="section-title" *ngIf="!isCollapsed">Tableau de bord</h3>

          <ul class="nav-menu">
            <li class="nav-item" *ngFor="let item of menuItems">
              <a
                [routerLink]="item.route"
                class="nav-link"
                [class.active]="item.isActive"
                [title]="isCollapsed ? item.label : ''">
                <i [class]="item.icon" class="nav-icon"></i>
                <span class="nav-label" *ngIf="!isCollapsed">{{ item.label }}</span>
                <span class="nav-badge" *ngIf="item.badge && item.badge > 0 && !isCollapsed">
                  {{ item.badge }}
                </span>
              </a>
            </li>
          </ul>
        </div>

        <div class="nav-section">
          <h3 class="section-title" *ngIf="!isCollapsed">Gestion</h3>

          <ul class="nav-menu">
            <li class="nav-item" *ngFor="let item of managementItems">
              <a
                [routerLink]="item.route"
                class="nav-link"
                [class.active]="item.isActive"
                [title]="isCollapsed ? item.label : ''">
                <i [class]="item.icon" class="nav-icon"></i>
                <span class="nav-label" *ngIf="!isCollapsed">{{ item.label }}</span>
                <span class="nav-badge" *ngIf="item.badge && item.badge > 0 && !isCollapsed">
                  {{ item.badge }}
                </span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Footer Info -->
      <div class="sidebar-footer">
        <div class="version-info" *ngIf="!isCollapsed">
          <span class="version">v2.1.0</span>
          <span class="role">Mode Livreur</span>
        </div>
        <div class="status-indicator online" [title]="isCollapsed ? 'En ligne' : ''">
          <i class="fas fa-circle"></i>
          <span *ngIf="!isCollapsed">En ligne</span>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./driver-sidebar.component.scss']
})
export class DriverSidebarComponent implements OnInit {
  @Input() isCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  menuItems: MenuItem[] = [
    {
      icon: 'fas fa-tachometer-alt',
      label: 'Tableau de bord',
      route: '/driver/dashboard',
      isActive: false
    },
    {
      icon: 'fas fa-box',
      label: 'Mes Colis',
      route: '/driver/shipments',
      badge: 0,
      isActive: false
    },
    {
      icon: 'fas fa-route',
      label: 'Itinéraires',
      route: '/driver/routes',
      isActive: false
    }
  ];

  managementItems: MenuItem[] = [
    {
      icon: 'fas fa-chart-line',
      label: 'Statistiques',
      route: '/driver/statistics',
      isActive: false
    },
    {
      icon: 'fas fa-user-circle',
      label: 'Mon Profil',
      route: '/driver/profile',
      isActive: false
    }
  ];

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.updateActiveRoute();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveRoute();
      });
  }

  onToggle(): void {
    this.toggleSidebar.emit();
  }

  private updateActiveRoute(): void {
    const currentRoute = this.router.url;

    // Update dashboard menu items
    this.menuItems.forEach(item => {
      item.isActive = currentRoute.includes(item.route);
    });

    // Update management menu items
    this.managementItems.forEach(item => {
      item.isActive = currentRoute.includes(item.route);
    });
  }
}
