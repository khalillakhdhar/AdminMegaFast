import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { firstValueFrom } from "rxjs";
import { take } from "rxjs/operators";

import { AuthenticationService } from "../services/auth.service";

/**
 * Functional guard that checks if user is authenticated
 * Uses Firebase Auth state as the source of truth
 */
export const AuthGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthenticationService);
  const afAuth = inject(AngularFireAuth);

  try {
    // Check Firebase Auth state directly
    const user = await firstValueFrom(afAuth.authState.pipe(take(1)));

    if (user) {
      // User is authenticated via Firebase
      return true;
    }

    // Fallback check for current user (legacy)
    const currentUser = authService.currentUser();
    if (currentUser) {
      return true;
    }

    // Not logged in - redirect to login
    router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
    return false;
  } catch (error) {
    console.error("AuthGuard error:", error);
    router.navigate(["/auth/login"], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
