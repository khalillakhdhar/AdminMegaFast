import { ErrorHandler, Injectable, Injector } from "@angular/core";
import { ToastrService } from "ngx-toastr";

/**
 * Global error handler that catches unhandled errors
 * and displays user-friendly notifications
 *
 * Uses Injector for lazy ToastrService injection to avoid
 * circular dependency during bootstrap
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toastr?: ToastrService;

  constructor(private injector: Injector) {}

  private getToastr(): ToastrService | undefined {
    if (!this.toastr) {
      try {
        this.toastr = this.injector.get(ToastrService);
      } catch (e) {
        // ToastrService not available during early bootstrap
        console.warn("ToastrService not available yet");
      }
    }
    return this.toastr;
  }

  handleError(error: unknown): void {
    // Extract error message
    let message = "Une erreur inattendue s'est produite";
    let title = "Erreur";

    if (error instanceof Error) {
      // Don't show chunk loading errors to user (handled by retry logic)
      if (
        error.message?.includes("ChunkLoadError") ||
        error.message?.includes("Loading chunk")
      ) {
        console.error("Chunk loading error:", error);
        return;
      }

      // Firebase auth errors - show user-friendly messages
      if (error.message?.includes("auth/")) {
        message = this.getFirebaseAuthErrorMessage(error.message);
        title = "Erreur d'authentification";
      }
      // Network errors
      else if (
        error.message?.includes("network") ||
        error.message?.includes("offline")
      ) {
        message =
          "Problème de connexion réseau. Veuillez vérifier votre connexion.";
        title = "Erreur réseau";
      }
      // Firebase Firestore errors
      else if (
        error.message?.includes("firestore") ||
        error.message?.includes("permission-denied")
      ) {
        message = "Erreur d'accès aux données. Veuillez vous reconnecter.";
        title = "Erreur de données";
      }
      // Generic error - show in development only
      else if (!this.isProduction()) {
        message = error.message;
      }
    }

    // Log error to console for debugging
    console.error("Global Error Handler caught:", error);

    // Show toast notification (only if ToastrService is available)
    const toastr = this.getToastr();
    if (toastr) {
      toastr.error(message, title, {
        timeOut: 5000,
        closeButton: true,
        progressBar: true,
        positionClass: "toast-top-right",
      });
    }
  }

  private getFirebaseAuthErrorMessage(errorMessage: string): string {
    if (errorMessage.includes("user-not-found")) {
      return "Utilisateur non trouvé";
    }
    if (errorMessage.includes("wrong-password")) {
      return "Mot de passe incorrect";
    }
    if (errorMessage.includes("email-already-in-use")) {
      return "Cette adresse email est déjà utilisée";
    }
    if (errorMessage.includes("weak-password")) {
      return "Le mot de passe est trop faible";
    }
    if (errorMessage.includes("invalid-email")) {
      return "Adresse email invalide";
    }
    if (errorMessage.includes("too-many-requests")) {
      return "Trop de tentatives. Veuillez réessayer plus tard.";
    }
    if (errorMessage.includes("network-request-failed")) {
      return "Problème de connexion réseau";
    }
    return "Erreur d'authentification";
  }

  private isProduction(): boolean {
    // Check if we're in production mode via environment file
    // Import environment at runtime if available
    try {
      // Use dynamic import pattern for environment checking
      const env = (window as unknown as Record<string, unknown>)["__env__"] as
        | Record<string, boolean>
        | undefined;
      return env?.production === true;
    } catch {
      return false;
    }
  }
}
