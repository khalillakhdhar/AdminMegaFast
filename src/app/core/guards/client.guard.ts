import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthenticationService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ClientGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const currentUser = this.authenticationService.currentUser();

        if (currentUser) {
            // Check if user is a client
            if (this.authenticationService.isClient()) {
                return true;
            }

            // If admin, redirect to admin dashboard
            if (this.authenticationService.isAdmin()) {
                this.router.navigate(['/megafast']);
                return false;
            }

            // If driver, redirect to appropriate dashboard
            if (this.authenticationService.isDriver()) {
                this.router.navigate(['/driver']); // You can implement driver portal later
                return false;
            }
        }

        // not logged in or no role, redirect to login
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
