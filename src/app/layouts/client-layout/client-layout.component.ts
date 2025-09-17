/* eslint-disable @typescript-eslint/no-empty-function */
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { ClientSidebarComponent } from './client-sidebar/client-sidebar.component';
import { ClientTopbarComponent } from './client-topbar/client-topbar.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ClientSidebarComponent, ClientTopbarComponent],
  template: `
    <div class="layout-wrapper client-layout-wrapper d-lg-flex">
      <!-- Bouton menu mobile fixe -->
      <button *ngIf="isMobile"
              type="button"
              class="btn btn-menu-toggle fixed-mobile-btn"
              (click)="toggleSidebar()"
              [attr.aria-expanded]="isSidebarOpen"
              aria-label="Toggle navigation menu">
        <i class="fas fa-bars" *ngIf="!isSidebarOpen"></i>
        <i class="fas fa-times" *ngIf="isSidebarOpen"></i>
      </button>

      <!-- Sidebar avec gestion mobile -->
      <div class="client-sidebar-wrapper"
           [class.sidebar-open]="isSidebarOpen"
           [class.d-none]="isMobile && !isSidebarOpen">
        <app-client-sidebar class="sidebar-menu-scroll"></app-client-sidebar>
      </div>

      <!-- Overlay pour mobile -->
      <div class="sidebar-overlay"
           [class.show]="isSidebarOpen && isMobile"
           (click)="onOverlayClick()"
           (keydown.enter)="onOverlayClick()"
           (keydown.space)="onOverlayClick()"
           role="button"
           tabindex="0"
           aria-label="Close sidebar overlay"></div>

      <!-- Main Content -->
      <div class="main-content client-main-content">
        <!-- Topbar -->
        <div class="client-topbar-wrapper">
          <app-client-topbar></app-client-topbar>
        </div>

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
export class ClientLayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = false;
  isMobile = false;
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    this.checkScreenSize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 991;

    // Ferme automatiquement la sidebar sur desktop
    if (!this.isMobile) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  // Ferme la sidebar en cliquant sur l'overlay
  onOverlayClick(): void {
    if (this.isMobile) {
      this.closeSidebar();
    }
  }

  // Gestion des touches du clavier pour l'accessibilité
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isSidebarOpen && this.isMobile) {
      this.closeSidebar();
    }
  }
}
