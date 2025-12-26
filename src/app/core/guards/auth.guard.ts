import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";

import { AuthenticationService } from "../services/auth.service";

/**
 * Functional guard that checks if user is authenticated
 */
export const AuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthenticationService);

  const currentUser = authService.currentUser();
  if (currentUser) {
    // logged in so return true
    return true;
  }

  // check if user data is in storage as a fallback
  if (localStorage.getItem("currentUser")) {
    return true;
  }

  // not logged in so redirect to login page with the return url
  router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
  return false;
};
