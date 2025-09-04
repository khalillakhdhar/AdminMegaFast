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
  ) { }

  ngOnInit() {
    this.loadUserProfile();
    this.loadNotifications();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile() {
    this.userProfileService.getCurrentUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe(profile => {
        this.userProfile = profile;
      });
  }

  private loadNotifications() {
    this.userProfileService.getUserNotificationsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.notificationsCount = count;
      });
  }

  logout() {
    console.log('🔓 Début de la déconnexion...');

    // Gérer la déconnexion avec gestion d'erreur et nettoyage complet
    try {
      console.log('🔍 Appel du service d\'authentification...');
      const logoutResult = this.authService.logout();
      console.log('📋 Résultat du logout:', logoutResult);

      // Si logout retourne une promesse, l'attendre
      if (logoutResult && typeof logoutResult.then === 'function') {
        console.log('⏳ Attente de la promesse de déconnexion...');
        logoutResult
          .then(() => {
            console.log('✅ Déconnexion Firebase réussie');
            this.performLogoutCleanup();
          })
          .catch((error: any) => {
            console.error('❌ Erreur lors de la déconnexion Firebase:', error);
            // Forcer le nettoyage même en cas d'erreur
            this.performLogoutCleanup();
          });
      } else {
        // Si logout ne retourne pas de promesse, effectuer le nettoyage immédiatement
        console.log('🔄 Logout synchrone, nettoyage immédiat');
        this.performLogoutCleanup();
      }
    } catch (error) {
      console.error('💥 Erreur critique lors de la déconnexion:', error);
      // En cas d'erreur, forcer le nettoyage
      this.performLogoutCleanup();
    }
  }

  // Méthode de déconnexion d'urgence (optionnelle pour debug)
  forceLogout() {
    console.log('Déconnexion forcée');

    // Nettoyer complètement le localStorage et sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    // Rediriger avec window.location pour forcer un rechargement complet
    window.location.href = '/auth/login';
  }

  private performLogoutCleanup() {
    console.log('🧹 Début du nettoyage après déconnexion...');

    // Nettoyer les données utilisateur du composant
    this.userProfile = null;
    this.notificationsCount = 0;
    console.log('✨ Données du composant nettoyées');

    // Navigation vers la page de login
    console.log('🚀 Navigation vers /auth/login...');
    this.router.navigate(['/auth/login']).then((success) => {
      if (success) {
        console.log('✅ Navigation vers login réussie');
      } else {
        console.log('⚠️ Navigation vers login échouée');
      }
    }).catch((error) => {
      console.error('❌ Erreur lors de la navigation:', error);
      // Fallback: forcer la redirection avec window.location
      console.log('🔄 Tentative de redirection avec window.location...');
      window.location.href = '/auth/login';
    });
  }
}
