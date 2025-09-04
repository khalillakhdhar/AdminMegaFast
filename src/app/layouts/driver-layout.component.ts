import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthenticationService } from '../core/services/auth.service';
import { UserProfileService } from '../core/services/user-profile.service';
import { DriverService } from '../core/services/driver-portal.service';
import { UserProfile } from '../core/models/user-profile.model';
import { DriverTopbarComponent } from './driver-topbar/driver-topbar.component';
import { DriverSidebarComponent } from './driver-sidebar/driver-sidebar.component';

@Component({
  selector: 'app-driver-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DriverTopbarComponent,
    DriverSidebarComponent
  ],
  template: `
    <div class="app-wrapper">
      <!-- Sidebar -->
      <app-driver-sidebar
        [isCollapsed]="isSidebarCollapsed"
        (toggleSidebar)="toggleSidebar()"
        class="sidebar"
        [class.collapsed]="isSidebarCollapsed">
      </app-driver-sidebar>

      <!-- Main Content -->
      <div class="main-content" [class.sidebar-collapsed]="isSidebarCollapsed">
        <!-- Topbar -->
        <app-driver-topbar
          [userProfile]="userProfile"
          (menuClick)="toggleSidebar()"
          (logoutClick)="handleLogout()"
          class="topbar">
        </app-driver-topbar>

        <!-- Page Content -->
        <div class="page-content">
          <router-outlet></router-outlet>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Chargement...</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./driver-layout.component.scss']
})
export class DriverLayoutComponent implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  isSidebarCollapsed = false;
  isLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly authService: AuthenticationService,
    private readonly userProfileService: UserProfileService,
    private readonly driverService: DriverService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.checkDriverAccess();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile(): void {
    this.userProfileService.getCurrentUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          this.userProfile = profile;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du profil:', error);
        }
      });
  }

  private checkDriverAccess(): void {
    if (!this.authService.isDriver()) {
      console.warn('Accès non autorisé au portail driver');
      this.router.navigate(['/auth/login']);
      return;
    }

    const driverId = this.driverService.getCurrentDriverId();
    if (!driverId) {
      console.warn('ID driver non trouvé');
      this.router.navigate(['/auth/login']);
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    // Save preference in localStorage
    localStorage.setItem('driverSidebarCollapsed', this.isSidebarCollapsed.toString());
  }

  async handleLogout(): Promise<void> {
    try {
      this.isLoading = true;
      await this.authService.logout();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Load sidebar state from localStorage
  private loadSidebarState(): void {
    const savedState = localStorage.getItem('driverSidebarCollapsed');
    if (savedState !== null) {
      this.isSidebarCollapsed = savedState === 'true';
    }
  }
}
