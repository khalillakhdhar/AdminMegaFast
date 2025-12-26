import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";

import { AuthenticationService } from "../services/auth.service";

/**
 * Functional guard that checks if user is a driver
 */
export const DriverGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthenticationService);

  const currentUser = authService.currentUser();

  if (currentUser) {
    // Check if user is a driver
    if (authService.isDriver()) {
      return true;
    }

    // If admin, redirect to admin dashboard
    if (authService.isAdmin()) {
      router.navigate(["/megafast"]);
      return false;
    }

    // If client, redirect to client portal
    if (authService.isClient()) {
      router.navigate(["/client"]);
      return false;
    }
  }

  // not logged in or no role, redirect to login
  router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
  return false;
};
