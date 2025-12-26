/* eslint-disable @angular-eslint/prefer-inject */
import { CommonModule } from "@angular/common";
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { DriverPortalService } from "../../core/services/driver-portal.service";
import { UserProfile } from "../../core/models/user-profile.model";

@Component({
  selector: "app-driver-topbar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="driver-topbar">
      <!-- Left Section -->
      <div class="topbar-left">
        <button
          class="menu-toggle"
          (click)="onMenuClick()"
          type="button"
          aria-label="Basculer le menu"
        >
          <i class="fas fa-bars"></i>
        </button>

        <div class="page-title">
          <h1>Portail Livreur</h1>
          <span class="subtitle">Gérez vos livraisons efficacement</span>
        </div>
      </div>

      <!-- Right Section -->
      <div class="topbar-right">
        <!-- Quick Stats -->
        <div class="quick-stats" *ngIf="stats">
          <div class="stat-item">
            <span class="stat-value">{{ stats.pendingShipments }}</span>
            <span class="stat-label">En attente</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.inTransitShipments }}</span>
            <span class="stat-label">En transit</span>
          </div>
          <div class="stat-item delivered">
            <span class="stat-value">{{ stats.deliveredShipments }}</span>
            <span class="stat-label">Livrés</span>
          </div>
        </div>

        <!-- Notifications -->
        <div class="notification-dropdown">
          <button
            class="notification-btn"
            type="button"
            aria-label="Notifications"
          >
            <i class="fas fa-bell"></i>
            <span class="notification-badge" *ngIf="notificationCount > 0">
              {{ notificationCount }}
            </span>
          </button>
        </div>

        <!-- User Profile -->
        <div class="user-profile-dropdown">
          <button
            class="profile-btn"
            (click)="toggleUserMenu()"
            type="button"
            aria-label="Menu utilisateur"
          >
            <div class="avatar">
              <img
                *ngIf="userProfile?.photoURL"
                [src]="userProfile.photoURL"
                [alt]="userProfile?.name || 'Avatar'"
                class="avatar-img"
              />
              <div *ngIf="!userProfile?.photoURL" class="avatar-placeholder">
                {{ getInitials(userProfile?.name || "") }}
              </div>
            </div>
            <div class="user-info">
              <span class="user-name">{{
                userProfile?.name || "Livreur"
              }}</span>
              <span class="user-role">{{ getUserRoleLabel() }}</span>
            </div>
            <i class="fas fa-chevron-down"></i>
          </button>

          <!-- User Menu -->
          <div class="user-menu" [class.show]="isUserMenuOpen">
            <div class="menu-header">
              <div class="user-details">
                <strong>{{ userProfile?.name || "Livreur" }}</strong>
                <span>{{ userProfile?.email || "" }}</span>
              </div>
            </div>
            <div class="menu-divider"></div>
            <div class="menu-items">
              <button class="menu-item" type="button">
                <i class="fas fa-user"></i>
                Mon Profil
              </button>
              <button class="menu-item" type="button">
                <i class="fas fa-chart-bar"></i>
                Mes Statistiques
              </button>
              <div class="menu-divider"></div>
              <button
                class="menu-item logout"
                (click)="onLogoutClick()"
                type="button"
              >
                <i class="fas fa-sign-out-alt"></i>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ["./driver-topbar.component.scss"],
})
export class DriverTopbarComponent implements OnInit, OnDestroy {
  @Input() userProfile: UserProfile | null = null;
  @Output() menuClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();

  isUserMenuOpen = false;
  notificationCount = 0;
  stats: any = null;

  private destroy$ = new Subject<void>();

  constructor(private readonly driverService: DriverPortalService) {}

  ngOnInit(): void {
    this.loadStats();
    this.setupClickOutside();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  onLogoutClick(): void {
    this.isUserMenuOpen = false;
    this.logoutClick.emit();
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  getInitials(name: string): string {
    if (!name) return "U";

    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  getUserRoleLabel(): string {
    return "Livreur";
  }

  private loadStats(): void {
    this.driverService
      .getDriverStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.stats = stats;
        },
        error: (error) => {
          console.error("Erreur lors du chargement des statistiques:", error);
        },
      });
  }

  private setupClickOutside(): void {
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const dropdown = target.closest(".user-profile-dropdown");

      if (!dropdown && this.isUserMenuOpen) {
        this.isUserMenuOpen = false;
      }
    });
  }
}
