import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserProfileService, UserProfile } from '../../../core/services/user-profile.service';
import { Subject, takeUntil } from 'rxjs';

interface ClientMenuItem {
  id: number;
  label: string;
  icon?: string;
  link?: string;
  isTitle?: boolean;
}

@Component({
  selector: 'app-client-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-sidebar.component.html',
  styleUrls: ['./client-sidebar.component.scss']
})
export class ClientSidebarComponent implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  private readonly destroy$ = new Subject<void>();

  menuItems: ClientMenuItem[] = [
    { id: 1, label: 'Mon Espace Client', isTitle: true },
    { id: 2, label: 'Tableau de bord', icon: 'bx-home-circle', link: '/client/dashboard' },

    { id: 3, label: 'Mes Colis', isTitle: true },
    { id: 4, label: 'Tous mes colis', icon: 'bx-package', link: '/client/shipments' },
    { id: 5, label: 'Nouveau colis', icon: 'bx-plus-circle', link: '/client/shipments/create' },
    { id: 6, label: 'Suivre un colis', icon: 'bx-search-alt', link: '/client/shipments/track' },

    { id: 7, label: 'Mon Compte', isTitle: true },
    { id: 8, label: 'Mon profil', icon: 'bx-user-circle', link: '/client/profile' },
  ];

  constructor(
    private readonly userProfileService: UserProfileService
  ) { }

  ngOnInit() {
    this.loadUserProfile();
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
}
