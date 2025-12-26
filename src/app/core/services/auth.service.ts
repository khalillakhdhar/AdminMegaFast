import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { AngularFireAuth } from "@angular/fire/compat/auth";

import { getFirebaseBackend } from "../../authUtils";
import { User } from "../../store/Authentication/auth.models";
import { from, map, switchMap, of, Observable, BehaviorSubject } from "rxjs";
import { take } from "rxjs/operators";

export interface UserRole {
  uid: string;
  email: string;
  role: "admin" | "client" | "driver";
  isActive: boolean;
  clientId?: string;
  driverId?: string;
  displayName?: string;
}

export interface TokenClaims {
  role?: "admin" | "client" | "driver";
  admin?: boolean;
  client?: boolean;
  driver?: boolean;
  clientId?: string;
  driverId?: string;
}

@Injectable({ providedIn: "root" })
export class AuthenticationService {
  user: User;

  // Cache des claims pour éviter les appels répétés
  private claimsCache$ = new BehaviorSubject<TokenClaims | null>(null);
  private claimsCacheValid = false;

  constructor(
    private readonly afs: AngularFirestore,
    private readonly afAuth: AngularFireAuth
  ) {
    // Écouter les changements d'état d'authentification pour invalider le cache
    this.afAuth.authState.subscribe((user) => {
      if (!user) {
        this.claimsCache$.next(null);
        this.claimsCacheValid = false;
      }
    });
  }

  /**
   * Normalize various possible email payloads into a string
   */
  private normalizeEmail(raw: any): string | null {
    if (!raw) return null;
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") {
      // common shapes
      if (typeof raw.email === "string") return raw.email;
      if (typeof raw.value === "string") return raw.value;
      if (typeof raw.address === "string") return raw.address;
    }
    return null;
  }

  /**
   * Returns the current user
   */
  public currentUser(): any {
    return getFirebaseBackend().getAuthenticatedUser();
  }

  /**
   * Get the current Firebase Auth user as Observable
   */
  public getCurrentAuthUser(): Observable<any> {
    return this.afAuth.authState;
  }

  /**
   * Get custom claims from the current user's ID token
   * This is the secure way to check roles - claims are set server-side
   */
  public async getTokenClaims(): Promise<TokenClaims | null> {
    try {
      const user = await this.afAuth.currentUser;
      if (!user) return null;

      // Force token refresh to get latest claims
      const tokenResult = await user.getIdTokenResult(true);
      const claims: TokenClaims = {
        role: tokenResult.claims["role"] as any,
        admin: tokenResult.claims["admin"] === true,
        client: tokenResult.claims["client"] === true,
        driver: tokenResult.claims["driver"] === true,
        clientId: tokenResult.claims["clientId"] as string,
        driverId: tokenResult.claims["driverId"] as string,
      };

      // Update cache
      this.claimsCache$.next(claims);
      this.claimsCacheValid = true;

      // Also update localStorage for backward compatibility and offline access
      this.syncClaimsToLocalStorage(claims);

      return claims;
    } catch (error) {
      console.error("Error getting token claims:", error);
      return null;
    }
  }

  /**
   * Get cached claims or fetch fresh ones
   */
  public async getCachedClaims(): Promise<TokenClaims | null> {
    if (this.claimsCacheValid && this.claimsCache$.value) {
      return this.claimsCache$.value;
    }
    return this.getTokenClaims();
  }

  /**
   * Sync claims to localStorage for backward compatibility
   */
  private syncClaimsToLocalStorage(claims: TokenClaims): void {
    if (claims.role) {
      localStorage.setItem("userRole", claims.role);
    }
    if (claims.clientId) {
      localStorage.setItem("clientId", claims.clientId);
    }
    if (claims.driverId) {
      localStorage.setItem("driverId", claims.driverId);
    }
  }

  /**
   * Force refresh of the ID token to get updated claims
   * Call this after a role change
   */
  public async refreshToken(): Promise<void> {
    try {
      const user = await this.afAuth.currentUser;
      if (user) {
        await user.getIdToken(true);
        await this.getTokenClaims(); // Refresh cache
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }

  /**
   * Get user role and details from Firestore
   */
  public getUserRole(uid: string) {
    return this.afs
      .collection("users")
      .doc(uid)
      .valueChanges()
      .pipe(
        map((userData: any) => {
          if (userData) {
            return {
              uid: uid,
              email: userData.email,
              role: userData.role || "admin",
              isActive: userData.isActive || true,
              clientId: userData.clientId,
              driverId: userData.driverId,
              displayName: userData.displayName,
            } as UserRole;
          }
          // Default to admin if no role found (existing users)
          return {
            uid: uid,
            email: "",
            role: "admin" as const,
            isActive: true,
          } as UserRole;
        })
      );
  }

  /**
   * Check if current user is admin (async - checks token claims)
   */
  public async isAdminAsync(): Promise<boolean> {
    const claims = await this.getCachedClaims();
    return claims?.admin === true;
  }

  /**
   * Check if current user is client (async - checks token claims)
   */
  public async isClientAsync(): Promise<boolean> {
    const claims = await this.getCachedClaims();
    return claims?.client === true;
  }

  /**
   * Check if current user is driver (async - checks token claims)
   */
  public async isDriverAsync(): Promise<boolean> {
    const claims = await this.getCachedClaims();
    return claims?.driver === true;
  }

  /**
   * Check if current user is admin (sync - uses cache/localStorage as fallback)
   * @deprecated Prefer isAdminAsync for security
   */
  public isAdmin(): boolean {
    // First check cache
    const cached = this.claimsCache$.value;
    if (cached) {
      return cached.admin === true;
    }

    // Fallback to localStorage (less secure but needed for sync checks)
    const currentUser = this.currentUser();
    if (!currentUser) return false;

    const storedRole = localStorage.getItem("userRole");
    return !storedRole || storedRole === "admin";
  }

  /**
   * Check if current user is client (sync - uses cache/localStorage as fallback)
   * @deprecated Prefer isClientAsync for security
   */
  public isClient(): boolean {
    const cached = this.claimsCache$.value;
    if (cached) {
      return cached.client === true;
    }
    const storedRole = localStorage.getItem("userRole");
    return storedRole === "client";
  }

  /**
   * Check if current user is driver (sync - uses cache/localStorage as fallback)
   * @deprecated Prefer isDriverAsync for security
   */
  public isDriver(): boolean {
    const cached = this.claimsCache$.value;
    if (cached) {
      return cached.driver === true;
    }
    const storedRole = localStorage.getItem("userRole");
    return storedRole === "driver";
  }

  /**
   * Get current user's client ID (if client)
   */
  public getCurrentClientId(): string | null {
    const cached = this.claimsCache$.value;
    if (cached?.clientId) {
      return cached.clientId;
    }
    if (this.isClient()) {
      return localStorage.getItem("clientId");
    }
    return null;
  }

  /**
   * Get current user's driver ID (if driver)
   */
  public getCurrentDriverId(): string | null {
    const cached = this.claimsCache$.value;
    if (cached?.driverId) {
      return cached.driverId;
    }
    if (this.isDriver()) {
      return localStorage.getItem("driverId");
    }
    return null;
  }

  /**
   * Performs the auth
   * @param email email of user
   * @param password password of user
   */
  login(email: string, password: string) {
    // getFirebaseBackend().loginUser returns a Promise; convert to Observable
    return from(getFirebaseBackend().loginUser(email, password)).pipe(
      switchMap((user: any) => {
        if (user?.uid) {
          // Get claims from token (secure) + fallback to Firestore
          return from(this.getTokenClaims()).pipe(
            switchMap((claims) => {
              if (claims?.role) {
                // Claims are set, we're good
                return of(user);
              }
              // Fallback: get role from Firestore and sync to localStorage
              return this.getUserRole(user.uid).pipe(
                take(1),
                map((userRole: UserRole) => {
                  localStorage.setItem("userRole", userRole.role);
                  if (userRole.clientId) {
                    localStorage.setItem("clientId", userRole.clientId);
                  }
                  if (userRole.driverId) {
                    localStorage.setItem("driverId", userRole.driverId);
                  }
                  return user;
                })
              );
            })
          );
        }
        return of(user);
      })
    );
  }

  /**
   * Performs the register
   * @param email email
   * @param password password
   */
  register(user: any) {
    // Defensive: ensure we pass email and password as separate args
    const email = this.normalizeEmail(user) as string | null;
    const password = user?.password || null;
    const displayName = user?.username || user?.displayName || "";

    if (!email || !password) {
      return from(
        Promise.reject(
          new Error("Email and password are required for registration")
        )
      );
    }

    // getFirebaseBackend().registerUser expects (email, password)
    return from(getFirebaseBackend().registerUser(email, password)).pipe(
      switchMap((firebaseUser: any) => {
        if (firebaseUser?.uid) {
          const uid = firebaseUser.uid;
          const userDoc: any = {
            uid,
            email,
            role: "admin",
            isActive: true,
            displayName: displayName || firebaseUser.displayName || "",
            createdAt: new Date(),
          };

          console.log("Creating Firestore user document for signup:", userDoc);

          return from(this.afs.collection("users").doc(uid).set(userDoc)).pipe(
            map(() => firebaseUser)
          );
        }
        return of(firebaseUser);
      })
    );
  }

  /**
   * Reset password
   * @param email email
   */
  resetPassword(email: string) {
    return from(getFirebaseBackend().forgetPassword(email));
  }

  /**
   * Logout the user
   */
  logout() {
    // Clear role information from localStorage
    localStorage.removeItem("userRole");
    localStorage.removeItem("clientId");
    localStorage.removeItem("driverId");
    localStorage.removeItem("currentUser");

    // Clear session storage as well
    sessionStorage.removeItem("authUser");
    sessionStorage.clear();

    // logout the user
    return getFirebaseBackend().logout();
  }
}
