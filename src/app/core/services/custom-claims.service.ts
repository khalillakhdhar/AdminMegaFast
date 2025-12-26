import { Injectable } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/compat/functions";
import { firstValueFrom } from "rxjs";
import { ToastrService } from "ngx-toastr";

export interface SetRoleResult {
  success: boolean;
  message: string;
  userId: string;
  claims?: {
    role: string;
    admin: boolean;
    client: boolean;
    driver: boolean;
    clientId?: string;
    driverId?: string;
  };
}

export interface InitAdminResult {
  success: boolean;
  message: string;
  userId: string;
}

/**
 * Service pour gérer les Custom Claims Firebase via Cloud Functions
 * Les claims sont définis côté serveur pour plus de sécurité
 */
@Injectable({ providedIn: "root" })
export class CustomClaimsService {
  constructor(
    private readonly fns: AngularFireFunctions,
    private readonly toastr: ToastrService
  ) {}

  /**
   * Définir le rôle d'un utilisateur via Cloud Function
   * Seuls les admins peuvent appeler cette fonction
   *
   * @param userId - L'UID Firebase de l'utilisateur
   * @param role - Le rôle: 'admin' | 'client' | 'driver'
   * @param clientId - L'ID du client (si role === 'client')
   * @param driverId - L'ID du driver (si role === 'driver')
   */
  async setUserRole(
    userId: string,
    role: "admin" | "client" | "driver",
    clientId?: string,
    driverId?: string
  ): Promise<SetRoleResult> {
    try {
      const callable = this.fns.httpsCallable<any, SetRoleResult>(
        "setUserRole"
      );
      const result = await firstValueFrom(
        callable({
          userId,
          role,
          clientId,
          driverId,
        })
      );

      if (result.success) {
        this.toastr.success(result.message, "Rôle défini");
      }

      return result;
    } catch (error: any) {
      console.error("Error setting user role:", error);

      const message = error?.message || "Erreur lors de la définition du rôle";
      this.toastr.error(message, "Erreur");

      return {
        success: false,
        message: message,
        userId: userId,
      };
    }
  }

  /**
   * Initialiser le premier administrateur
   * À utiliser une seule fois lors du setup initial
   *
   * @param userId - L'UID de l'utilisateur à promouvoir admin
   * @param setupSecret - Le secret de configuration (défini dans Firebase config)
   */
  async initializeFirstAdmin(
    userId: string,
    setupSecret: string
  ): Promise<InitAdminResult> {
    try {
      const callable = this.fns.httpsCallable<any, InitAdminResult>(
        "initializeFirstAdmin"
      );
      const result = await firstValueFrom(
        callable({
          userId,
          setupSecret,
        })
      );

      if (result.success) {
        this.toastr.success(result.message, "Admin initialisé");
      }

      return result;
    } catch (error: any) {
      console.error("Error initializing first admin:", error);

      const message = error?.message || "Erreur lors de l'initialisation";
      this.toastr.error(message, "Erreur");

      return {
        success: false,
        message: message,
        userId: userId,
      };
    }
  }

  /**
   * Supprimer un compte utilisateur
   *
   * @param userId - L'UID de l'utilisateur à supprimer
   */
  async deleteUserAccount(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const callable = this.fns.httpsCallable("deleteUserAccount");
      const result = (await firstValueFrom(callable({ userId }))) as any;

      if (result.success) {
        this.toastr.success(result.message, "Compte supprimé");
      }

      return result;
    } catch (error: any) {
      console.error("Error deleting user:", error);

      const message = error?.message || "Erreur lors de la suppression";
      this.toastr.error(message, "Erreur");

      return {
        success: false,
        message: message,
      };
    }
  }

  /**
   * Désactiver un compte utilisateur
   *
   * @param userId - L'UID de l'utilisateur à désactiver
   */
  async disableUserAccount(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const callable = this.fns.httpsCallable("disableUserAccount");
      const result = (await firstValueFrom(callable({ userId }))) as any;

      if (result.success) {
        this.toastr.success(result.message, "Compte désactivé");
      }

      return result;
    } catch (error: any) {
      console.error("Error disabling user:", error);

      const message = error?.message || "Erreur lors de la désactivation";
      this.toastr.error(message, "Erreur");

      return {
        success: false,
        message: message,
      };
    }
  }

  /**
   * Réactiver un compte utilisateur
   *
   * @param userId - L'UID de l'utilisateur à réactiver
   */
  async enableUserAccount(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const callable = this.fns.httpsCallable("enableUserAccount");
      const result = (await firstValueFrom(callable({ userId }))) as any;

      if (result.success) {
        this.toastr.success(result.message, "Compte réactivé");
      }

      return result;
    } catch (error: any) {
      console.error("Error enabling user:", error);

      const message = error?.message || "Erreur lors de la réactivation";
      this.toastr.error(message, "Erreur");

      return {
        success: false,
        message: message,
      };
    }
  }
}
