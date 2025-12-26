import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { Observable, from, of } from "rxjs";
import { map, switchMap, take } from "rxjs/operators";
import { ToastrService } from "ngx-toastr";

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "client" | "driver";
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  entityId?: string; // clientId or driverId
  temporaryPassword?: string; // Only stored temporarily for admin reference
  passwordSetByAdmin?: boolean;
  passwordResetRequired?: boolean;
}

export interface CreateAccountParams {
  email: string;
  password: string; // Admin-defined password
  displayName: string;
  role: "client" | "driver";
  entityId?: string;
  sendWelcomeEmail?: boolean;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  temporaryPassword?: string;
}

@Injectable({
  providedIn: "root",
})
export class UserManagementService {
  private readonly usersCol = this.afs.collection<UserAccount>("users");

  constructor(
    private readonly afs: AngularFirestore,
    private readonly afAuth: AngularFireAuth,
    private readonly toastr: ToastrService
  ) {}

  /**
   * Get all user accounts
   */
  getAllUsers(): Observable<UserAccount[]> {
    return this.afs
      .collection<UserAccount>("users", (ref) =>
        ref.orderBy("createdAt", "desc")
      )
      .valueChanges({ idField: "uid" });
  }

  /**
   * Get users by role
   */
  getUsersByRole(
    role: "admin" | "client" | "driver"
  ): Observable<UserAccount[]> {
    return this.afs
      .collection<UserAccount>("users", (ref) =>
        ref.where("role", "==", role).orderBy("createdAt", "desc")
      )
      .valueChanges({ idField: "uid" });
  }

  /**
   * Get user by ID
   */
  getUserById(uid: string): Observable<UserAccount | undefined> {
    return this.usersCol.doc(uid).valueChanges();
  }

  /**
   * Create user account with admin-defined password
   * This method creates the Firebase Auth user and stores user data in Firestore
   */
  async createUserWithPassword(
    params: CreateAccountParams
  ): Promise<{ uid: string; success: boolean }> {
    try {
      // Create Firebase Auth user with admin-defined password
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(
        params.email,
        params.password
      );

      if (!userCredential.user) {
        throw new Error("Failed to create user account");
      }

      const uid = userCredential.user.uid;
      const now = new Date();

      // Update user profile
      await userCredential.user.updateProfile({
        displayName: params.displayName,
      });

      // Store user data in Firestore
      const userData: UserAccount = {
        uid,
        email: params.email,
        displayName: params.displayName,
        role: params.role,
        isActive: true,
        createdAt: now,
        entityId: params.entityId,
        passwordSetByAdmin: true,
        passwordResetRequired: true, // Recommend user changes password on first login
        temporaryPassword: params.password, // Store for admin reference (will be cleared after first login)
      };

      await this.usersCol.doc(uid).set(userData);

      this.toastr.success(
        `Compte créé pour ${params.email}. Le mot de passe est: ${params.password}`,
        "Compte créé avec succès",
        { timeOut: 10000 }
      );

      return { uid, success: true };
    } catch (error: any) {
      console.error("Error creating user account:", error);

      let errorMessage = "Erreur lors de la création du compte";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Cette adresse email est déjà utilisée";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Le mot de passe doit contenir au moins 6 caractères";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Adresse email invalide";
      }

      this.toastr.error(errorMessage);
      throw error;
    }
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 12): string {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghjkmnpqrstuvwxyz";
    const numbers = "23456789";
    const special = "!@#$%^&*";
    const all = uppercase + lowercase + numbers + special;

    let password = "";

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest
    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Reset user password (admin function)
   * Generates a new password and updates the user
   */
  async resetUserPassword(
    uid: string,
    newPassword?: string
  ): Promise<PasswordResetResult> {
    try {
      const user = await this.getUserById(uid).pipe(take(1)).toPromise();

      if (!user) {
        return { success: false, message: "Utilisateur non trouvé" };
      }

      const password = newPassword || this.generateSecurePassword();

      // Send password reset email via Firebase
      await this.afAuth.sendPasswordResetEmail(user.email);

      // Update user record
      await this.usersCol.doc(uid).update({
        temporaryPassword: password,
        passwordResetRequired: true,
        passwordSetByAdmin: true,
      });

      this.toastr.success(
        `Email de réinitialisation envoyé à ${user.email}`,
        "Réinitialisation du mot de passe"
      );

      return {
        success: true,
        message: `Email de réinitialisation envoyé à ${user.email}`,
        temporaryPassword: password,
      };
    } catch (error: any) {
      console.error("Error resetting password:", error);
      this.toastr.error("Erreur lors de la réinitialisation du mot de passe");
      return { success: false, message: error.message };
    }
  }

  /**
   * Set a specific password for a user (requires admin SDK - use with caution)
   * Note: Firebase client SDK cannot directly set another user's password.
   * This would require a Cloud Function. Here we provide the workaround.
   */
  async setUserPasswordDirectly(
    uid: string,
    newPassword: string
  ): Promise<PasswordResetResult> {
    try {
      const user = await this.getUserById(uid).pipe(take(1)).toPromise();

      if (!user) {
        return { success: false, message: "Utilisateur non trouvé" };
      }

      // Store the password for reference (admin will communicate it to user)
      await this.usersCol.doc(uid).update({
        temporaryPassword: newPassword,
        passwordResetRequired: true,
        passwordSetByAdmin: true,
      });

      // Send password reset email so user can set their own password
      await this.afAuth.sendPasswordResetEmail(user.email);

      this.toastr.success(
        `Le mot de passe a été défini. Un email a été envoyé à ${user.email} pour confirmation.`,
        "Mot de passe mis à jour"
      );

      return {
        success: true,
        message: `Mot de passe défini pour ${user.email}. Email de confirmation envoyé.`,
        temporaryPassword: newPassword,
      };
    } catch (error: any) {
      console.error("Error setting password:", error);
      this.toastr.error("Erreur lors de la définition du mot de passe");
      return { success: false, message: error.message };
    }
  }

  /**
   * Toggle user active status
   */
  async toggleUserStatus(uid: string): Promise<void> {
    const user = await this.getUserById(uid).pipe(take(1)).toPromise();

    if (!user) {
      this.toastr.error("Utilisateur non trouvé");
      return;
    }

    const newStatus = !user.isActive;
    await this.usersCol.doc(uid).update({ isActive: newStatus });

    this.toastr.success(
      `Utilisateur ${newStatus ? "activé" : "désactivé"}`,
      "Statut mis à jour"
    );
  }

  /**
   * Delete user account
   * Note: This only deletes Firestore data. Firebase Auth deletion requires Admin SDK.
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await this.usersCol.doc(uid).delete();
      this.toastr.success("Compte utilisateur supprimé");
    } catch (error) {
      console.error("Error deleting user:", error);
      this.toastr.error("Erreur lors de la suppression du compte");
      throw error;
    }
  }

  /**
   * Clear temporary password after user's first login
   */
  async clearTemporaryPassword(uid: string): Promise<void> {
    await this.usersCol.doc(uid).update({
      temporaryPassword: null,
      passwordResetRequired: false,
    });
  }

  /**
   * Get users pending password change
   */
  getPendingPasswordResets(): Observable<UserAccount[]> {
    return this.afs
      .collection<UserAccount>("users", (ref) =>
        ref.where("passwordResetRequired", "==", true)
      )
      .valueChanges({ idField: "uid" });
  }

  /**
   * Copy password to clipboard
   */
  copyPasswordToClipboard(password: string): void {
    navigator.clipboard
      .writeText(password)
      .then(() => {
        this.toastr.info(
          "Mot de passe copié dans le presse-papiers",
          "Copié!",
          { timeOut: 2000 }
        );
      })
      .catch(() => {
        this.toastr.error("Impossible de copier le mot de passe");
      });
  }
}
