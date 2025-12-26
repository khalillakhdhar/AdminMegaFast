import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";

import { AuthenticationService } from "../services/auth.service";

/**
 * Functional guard that checks if user is an admin
 * Verifies role via Firebase Custom Claims (secure, server-set)
 */
export const AdminGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthenticationService);

  try {
    // Get claims from Firebase token (secure - set server-side)
    const claims = await authService.getTokenClaims();

    if (claims) {
      // Check if user is admin via custom claims
      if (claims.admin === true) {
        return true;
      }

      // If client, redirect to client portal
      if (claims.client === true) {
        router.navigate(["/client"]);
        return false;
      }

      // If driver, redirect to driver portal
      if (claims.driver === true) {
        router.navigate(["/driver"]);
        return false;
      }
    }

    // Fallback: check sync methods (uses cache/localStorage)
    const currentUser = authService.currentUser();
    if (currentUser) {
      if (authService.isAdmin()) {
        return true;
      }
      if (authService.isClient()) {
        router.navigate(["/client"]);
        return false;
      }
      if (authService.isDriver()) {
        router.navigate(["/driver"]);
        return false;
      }
    }

    // Not logged in or no role, redirect to login
    router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
    return false;
  } catch (error) {
    console.error("AdminGuard error:", error);
    router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
