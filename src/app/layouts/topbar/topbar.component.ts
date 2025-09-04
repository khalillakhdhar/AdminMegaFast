import { Component, OnInit, Output, EventEmitter, Inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AuthenticationService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { CookieService } from 'ngx-cookie-service';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { changesLayout } from 'src/app/store/layouts/layout.actions';
import { getLayoutMode } from 'src/app/store/layouts/layout.selector';
import { RootReducerState } from 'src/app/store';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { SimplebarAngularModule } from 'simplebar-angular';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, BsDropdownModule, SimplebarAngularModule],
  providers: [CookieService],
})

/**
 * Topbar component
 */
export class TopbarComponent implements OnInit {
  mode: any
  element: any;
  cookieValue: any;
  flagvalue: any;
  countryName: any;
  valueset: any;
  theme: any;
  layout: string;
  dataLayout$: Observable<string>;
  username: string = '';
  userFirstLetter: string = '';
  constructor(@Inject(DOCUMENT) private readonly document: any,
    private readonly router: Router,
    private readonly authService: AuthenticationService,
    public _cookiesService: CookieService,
    public store: Store<RootReducerState>) {

  }

  // Using only French language
  listLang: any = [
    { text: 'Français', flag: 'assets/images/flags/french.jpg', lang: 'fr' },
  ];

  openMobileMenu: boolean;

  @Output() settingsButtonClicked = new EventEmitter();
  @Output() mobileMenuButtonClicked = new EventEmitter();

  ngOnInit() {
    this.store.select('layout').subscribe((data) => {
      this.theme = data.DATA_LAYOUT;
    });
    this.openMobileMenu = false;
    this.element = document.documentElement;

    // Get current user information
    const currentUser = this.authService.currentUser();
    // Using optional chaining
    if (currentUser?.email) {
      // Extract username from email (before @)
      this.username = currentUser.email.split('@')[0];
      // Get first letter of username for avatar
      this.userFirstLetter = this.username.charAt(0).toUpperCase();
    } else {
      this.username = 'Utilisateur';
      this.userFirstLetter = 'U';
    }

    // Set French as default language
    this._cookiesService.set('lang', 'fr');
    this.cookieValue = 'fr';
    this.countryName = 'Français';
    this.flagvalue = 'assets/images/flags/french.jpg';
  }

  setLanguage(text: string, lang: string, flag: string) {
    this.countryName = text;
    this.flagvalue = flag;
    this.cookieValue = lang;
    // Set French as default language
    this._cookiesService.set('lang', 'fr');
  }

  /**
   * Toggles the right sidebar
   */
  toggleRightSidebar() {
    this.settingsButtonClicked.emit();
  }

  /**
   * Toggle the menu bar when having mobile screen
   */
  toggleMobileMenu(event: any) {
    event.preventDefault();
    this.mobileMenuButtonClicked.emit();
  }

  /**
   * Logout the user
   */
  logout() {
    // Call the logout method and properly handle Promise
    this.authService.logout()
      .then(() => {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('authUser');
        this.router.navigate(['/auth/login']);
      })
      .catch(error => {
        console.error('Logout error:', error);
      });
  }

  /**
   * Fullscreen method
   */
  fullscreen() {
    document.body.classList.toggle('fullscreen-enable');
    if (
      !document.fullscreenElement && !this.element.mozFullScreenElement &&
      !this.element.webkitFullscreenElement) {
      if (this.element.requestFullscreen) {
        this.element.requestFullscreen();
      } else if (this.element.mozRequestFullScreen) {
        /* Firefox */
        this.element.mozRequestFullScreen();
      } else if (this.element.webkitRequestFullscreen) {
        /* Chrome, Safari and Opera */
        this.element.webkitRequestFullscreen();
      } else if (this.element.msRequestFullscreen) {
        /* IE/Edge */
        this.element.msRequestFullscreen();
      }
    } else {
      // Fix lint error by avoiding single if statement in else block
      this.exitFullscreen();
    }
  }

  /**
   * Exit fullscreen mode
   */
  private exitFullscreen(): void {
    if (this.document.exitFullscreen) {
      this.document.exitFullscreen();
    } else if (this.document.mozCancelFullScreen) {
      /* Firefox */
      this.document.mozCancelFullScreen();
    } else if (this.document.webkitExitFullscreen) {
      /* Chrome, Safari and Opera */
      this.document.webkitExitFullscreen();
    } else if (this.document.msExitFullscreen) {
      /* IE/Edge */
      this.document.msExitFullscreen();
    }
  }

  changeLayout(layoutMode: string) {
    this.theme = layoutMode;
    this.store.dispatch(changesLayout({ layoutMode }));
    this.store.select(getLayoutMode).subscribe((layout) => {
      document.documentElement.setAttribute('data-layout', layout)
    })
  }
}
