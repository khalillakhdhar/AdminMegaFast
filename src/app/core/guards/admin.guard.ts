import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthenticationService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const currentUser = this.authenticationService.currentUser();

        if (currentUser) {
            // Check if user is admin
            if (this.authenticationService.isAdmin()) {
                return true;
            }

            // If client, redirect to client portal
            if (this.authenticationService.isClient()) {
                this.router.navigate(['/client']);
                return false;
            }

            // If driver, redirect to driver portal
            if (this.authenticationService.isDriver()) {
                this.router.navigate(['/driver']); // You can implement driver portal later
                return false;
            }
        }

        // not logged in, redirect to login
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
