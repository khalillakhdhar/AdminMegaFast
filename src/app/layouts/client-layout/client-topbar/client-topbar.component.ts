/* eslint-disable @angular-eslint/prefer-inject */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthenticationService } from '../../../core/services/auth.service';
import { UserProfileService, UserProfile } from '../../../core/services/user-profile.service';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-client-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-topbar.component.html',
  styleUrls: ['./client-topbar.component.scss']
})
export class ClientTopbarComponent implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  notificationsCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthenticationService,
    private readonly userProfileService: UserProfileService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile(): void {
    this.userProfileService.getCurrentUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.userProfile = profile;
      });
  }

  private loadNotifications(): void {
    this.userProfileService.getUserNotificationsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.notificationsCount = count;
      });
  }

  logout(): void {
    console.log('🔓 Début de la déconnexion...');

    // Nettoyage immédiat des données locales
    this.userProfile = null;
    this.notificationsCount = 0;

    // Appel de la déconnexion Firebase
    try {
      const logoutResult = this.authService.logout();
      console.log('📋 Résultat du logout:', logoutResult);

      // Si logout retourne une promesse, l'attendre
      if (logoutResult && typeof logoutResult.then === 'function') {
        logoutResult
          .then(() => {
            console.log('✅ Déconnexion Firebase réussie');
            this.navigateToLogin();
          })
          .catch((error: unknown) => {
            console.error('❌ Erreur lors de la déconnexion Firebase:', error);
            // Forcer la navigation même en cas d'erreur
            this.navigateToLogin();
          });
      } else {
        // Si logout ne retourne pas de promesse, naviguer immédiatement
        console.log('🔄 Logout synchrone, navigation immédiate');
        this.navigateToLogin();
      }
    } catch (error) {
      console.error('💥 Erreur critique lors de la déconnexion:', error);
      // En cas d'erreur, forcer la navigation
      this.navigateToLogin();
    }
  }

  private navigateToLogin(): void {
    console.log('🚀 Navigation vers /auth/login...');
    this.router.navigate(['/auth/login']).then((success) => {
      if (success) {
        console.log('✅ Navigation vers login réussie');
      } else {
        console.log('⚠️ Navigation vers login échouée, redirection forcée');
        window.location.href = '/auth/login';
      }
    }).catch((error) => {
      console.error('❌ Erreur lors de la navigation:', error);
      window.location.href = '/auth/login';
    });
  }
}
