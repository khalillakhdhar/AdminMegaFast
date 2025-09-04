import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthenticationService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class DriverGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const currentUser = this.authenticationService.currentUser();

        if (currentUser) {
            // Check if user is a driver
            if (this.authenticationService.isDriver()) {
                return true;
            }

            // If admin, redirect to admin dashboard
            if (this.authenticationService.isAdmin()) {
                this.router.navigate(['/megafast']);
                return false;
            }

            // If client, redirect to client portal
            if (this.authenticationService.isClient()) {
                this.router.navigate(['/client']);
                return false;
            }
        }

        // not logged in or no role, redirect to login
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
