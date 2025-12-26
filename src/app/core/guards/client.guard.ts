import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";

import { AuthenticationService } from "../services/auth.service";

/**
 * Functional guard that checks if user is a client
 */
export const ClientGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthenticationService);

  const currentUser = authService.currentUser();

  if (currentUser) {
    // Check if user is a client
    if (authService.isClient()) {
      return true;
    }

    // If admin, redirect to admin dashboard
    if (authService.isAdmin()) {
      router.navigate(["/megafast"]);
      return false;
    }

    // If driver, redirect to driver portal
    if (authService.isDriver()) {
      router.navigate(["/driver"]);
      return false;
    }
  }

  // not logged in or no role, redirect to login
  router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
  return false;
};
