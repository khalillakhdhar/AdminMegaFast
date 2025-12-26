import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";

import { AuthenticationService } from "../services/auth.service";

/**
 * Functional guard that checks if user is an admin
 */
export const AdminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthenticationService);

  const currentUser = authService.currentUser();

  if (currentUser) {
    // Check if user is admin
    if (authService.isAdmin()) {
      return true;
    }

    // If client, redirect to client portal
    if (authService.isClient()) {
      router.navigate(["/client"]);
      return false;
    }

    // If driver, redirect to driver portal
    if (authService.isDriver()) {
      router.navigate(["/driver"]);
      return false;
    }
  }

  // not logged in, redirect to login
  router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
  return false;
};
