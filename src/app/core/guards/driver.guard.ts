import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";

import { AuthenticationService } from "../services/auth.service";

/**
 * Functional guard that checks if user is a driver
 * Verifies role via Firebase Custom Claims (secure, server-set)
 */
export const DriverGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthenticationService);

  try {
    // Get claims from Firebase token (secure - set server-side)
    const claims = await authService.getTokenClaims();

    if (claims) {
      // Check if user is driver via custom claims
      if (claims.driver === true) {
        return true;
      }

      // If admin, redirect to admin dashboard
      if (claims.admin === true) {
        router.navigate(["/megafast"]);
        return false;
      }

      // If client, redirect to client portal
      if (claims.client === true) {
        router.navigate(["/client"]);
        return false;
      }
    }

    // Fallback: check sync methods (uses cache/localStorage)
    const currentUser = authService.currentUser();
    if (currentUser) {
      if (authService.isDriver()) {
        return true;
      }
      if (authService.isAdmin()) {
        router.navigate(["/megafast"]);
        return false;
      }
      if (authService.isClient()) {
        router.navigate(["/client"]);
        return false;
      }
    }

    // Not logged in or no role, redirect to login
    router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
    return false;
  } catch (error) {
    console.error("DriverGuard error:", error);
    router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
