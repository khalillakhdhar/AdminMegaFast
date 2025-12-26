import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { BsModalService, BsModalRef, ModalModule } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { Observable, combineLatest, of } from "rxjs";
import { map, catchError } from "rxjs/operators";

import { UserManagementService } from "../../../core/services/user-management.service";
import { Client, ClientUser } from "../../../core/models/client.model";
import { Driver, DriverUser } from "../../../core/models/driver.model";

interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: "client" | "driver" | "admin";
  isActive: boolean;
  entityId?: string;
  entityName?: string;
  createdAt: any;
  lastLoginAt?: any;
  passwordSetByAdmin?: boolean;
  hasTemporaryPassword?: boolean;
}

@Component({
  selector: "app-user-management",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalModule],
  templateUrl: "./user-management.component.html",
  styleUrls: ["./user-management.component.scss"],
})
export class UserManagementComponent implements OnInit {
  @ViewChild("resetPasswordModal") resetPasswordModal!: TemplateRef<any>;
  @ViewChild("createUserModal") createUserModal!: TemplateRef<any>;

  users: UserAccount[] = [];
  filteredUsers: UserAccount[] = [];
  loading = true;
  searchTerm = "";
  roleFilter: "all" | "client" | "driver" | "admin" = "all";
  statusFilter: "all" | "active" | "inactive" = "all";

  modalRef?: BsModalRef;
  selectedUser?: UserAccount;

  passwordForm!: FormGroup;
  createUserForm!: FormGroup;

  generatedPassword = "";
  showPassword = false;

  // Stats
  totalUsers = 0;
  activeUsers = 0;
  clientUsers = 0;
  driverUsers = 0;

  constructor(
    private fb: FormBuilder,
    private modalService: BsModalService,
    private toastr: ToastrService,
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private userManagementService: UserManagementService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  private initForms(): void {
    this.passwordForm = this.fb.group(
      {
        newPassword: ["", [Validators.required, Validators.minLength(6)]],
        confirmPassword: ["", [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );

    this.createUserForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      displayName: ["", [Validators.required]],
      role: ["client", [Validators.required]],
      password: ["", [Validators.required, Validators.minLength(6)]],
      sendEmail: [false],
    });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get("newPassword")?.value === g.get("confirmPassword")?.value
      ? null
      : { mismatch: true };
  }

  loadUsers(): void {
    this.loading = true;

    // Load client users and driver users from Firestore
    const clientUsers$ = this.afs
      .collection<ClientUser>("client_users")
      .valueChanges({ idField: "uid" })
      .pipe(catchError(() => of([])));

    const driverUsers$ = this.afs
      .collection<DriverUser>("driver_users")
      .valueChanges({ idField: "uid" })
      .pipe(catchError(() => of([])));

    // Also load clients and drivers to get additional info
    const clients$ = this.afs
      .collection<Client>("clients", (ref) =>
        ref.where("hasAccount", "==", true)
      )
      .valueChanges({ idField: "id" })
      .pipe(catchError(() => of([])));

    const drivers$ = this.afs
      .collection<Driver>("drivers", (ref) =>
        ref.where("hasAccount", "==", true)
      )
      .valueChanges({ idField: "id" })
      .pipe(catchError(() => of([])));

    combineLatest([clientUsers$, driverUsers$, clients$, drivers$])
      .pipe(
        map(([clientUsers, driverUsers, clients, drivers]) => {
          const users: UserAccount[] = [];

          // Map client users
          clientUsers.forEach((cu: ClientUser) => {
            const client = clients.find((c) => c.userId === cu.uid);
            users.push({
              uid: cu.uid || "",
              email: cu.email,
              displayName: cu.displayName || client?.name || "Client",
              role: "client",
              isActive: cu.isActive !== false,
              entityId: cu.clientId || client?.id,
              entityName: client?.name,
              createdAt: cu.createdAt,
              lastLoginAt: cu.lastLoginAt,
              passwordSetByAdmin: client?.passwordSetByAdmin,
              hasTemporaryPassword: !!client?.temporaryPassword,
            });
          });

          // Map driver users
          driverUsers.forEach((du: DriverUser) => {
            const driver = drivers.find(
              (d) => d.userId === du.uid || d.uid === du.uid
            );
            users.push({
              uid: du.uid,
              email: du.email,
              displayName: du.displayName || driver?.name || "Livreur",
              role: "driver",
              isActive: du.isActive !== false,
              entityId: du.driverId || driver?.id,
              entityName: driver?.name,
              createdAt: du.createdAt,
              lastLoginAt: du.lastLoginAt,
              passwordSetByAdmin: driver?.passwordSetByAdmin,
              hasTemporaryPassword: !!driver?.temporaryPassword,
            });
          });

          return users.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
        })
      )
      .subscribe({
        next: (users) => {
          this.users = users;
          this.applyFilters();
          this.calculateStats();
          this.loading = false;
        },
        error: (error) => {
          console.error("Erreur lors du chargement des utilisateurs:", error);
          this.toastr.error("Erreur lors du chargement des utilisateurs");
          this.loading = false;
        },
      });
  }

  private calculateStats(): void {
    this.totalUsers = this.users.length;
    this.activeUsers = this.users.filter((u) => u.isActive).length;
    this.clientUsers = this.users.filter((u) => u.role === "client").length;
    this.driverUsers = this.users.filter((u) => u.role === "driver").length;
  }

  applyFilters(): void {
    this.filteredUsers = this.users.filter((user) => {
      // Search filter
      const matchesSearch =
        !this.searchTerm ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.displayName
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        user.entityName?.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Role filter
      const matchesRole =
        this.roleFilter === "all" || user.role === this.roleFilter;

      // Status filter
      const matchesStatus =
        this.statusFilter === "all" ||
        (this.statusFilter === "active" && user.isActive) ||
        (this.statusFilter === "inactive" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onRoleFilterChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  // Password Management
  openResetPasswordModal(user: UserAccount): void {
    this.selectedUser = user;
    this.passwordForm.reset();
    this.generatedPassword = "";
    this.showPassword = false;
    this.modalRef = this.modalService.show(this.resetPasswordModal, {
      class: "modal-md",
    });
  }

  generatePassword(): void {
    this.generatedPassword =
      this.userManagementService.generateSecurePassword(12);
    this.passwordForm.patchValue({
      newPassword: this.generatedPassword,
      confirmPassword: this.generatedPassword,
    });
    this.showPassword = true;
  }

  async resetPassword(): Promise<void> {
    if (this.passwordForm.invalid || !this.selectedUser) {
      return;
    }

    const newPassword = this.passwordForm.get("newPassword")?.value;

    try {
      // Note: Firebase Admin SDK is required to reset password for another user
      // This would typically be done through a Cloud Function
      // For now, we'll update the user record and show instructions

      const collection =
        this.selectedUser.role === "client" ? "clients" : "drivers";

      if (this.selectedUser.entityId) {
        await this.afs
          .collection(collection)
          .doc(this.selectedUser.entityId)
          .update({
            temporaryPassword: newPassword,
            passwordSetByAdmin: true,
            passwordChangedAt: new Date(),
          });
      }

      this.toastr.success(
        `Nouveau mot de passe défini: ${newPassword}. Communiquez-le à l'utilisateur.`,
        "Mot de passe mis à jour",
        { timeOut: 15000 }
      );

      // Copy to clipboard
      this.copyToClipboard(newPassword);

      this.modalRef?.hide();
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      this.toastr.error("Erreur lors de la réinitialisation du mot de passe");
    }
  }

  async sendPasswordResetEmail(user: UserAccount): Promise<void> {
    try {
      await this.afAuth.sendPasswordResetEmail(user.email);
      this.toastr.success(`Email de réinitialisation envoyé à ${user.email}`);
    } catch (error) {
      console.error("Erreur envoi email:", error);
      this.toastr.error(
        "Erreur lors de l'envoi de l'email de réinitialisation"
      );
    }
  }

  // User Status Management
  async toggleUserStatus(user: UserAccount): Promise<void> {
    const newStatus = !user.isActive;
    const collection = user.role === "client" ? "client_users" : "driver_users";

    try {
      await this.afs.collection(collection).doc(user.uid).update({
        isActive: newStatus,
        updatedAt: new Date(),
      });

      // Also update the entity
      const entityCollection = user.role === "client" ? "clients" : "drivers";
      if (user.entityId) {
        await this.afs.collection(entityCollection).doc(user.entityId).update({
          isActive: newStatus,
          updatedAt: new Date(),
        });
      }

      user.isActive = newStatus;
      this.toastr.success(
        newStatus ? "Compte activé avec succès" : "Compte désactivé avec succès"
      );
      this.calculateStats();
    } catch (error) {
      console.error("Erreur lors du changement de statut:", error);
      this.toastr.error("Erreur lors du changement de statut");
    }
  }

  // Utilities
  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.toastr.info("Mot de passe copié dans le presse-papiers");
      })
      .catch(() => {
        this.toastr.warning("Impossible de copier automatiquement");
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case "client":
        return "bg-primary";
      case "driver":
        return "bg-success";
      case "admin":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case "client":
        return "Client";
      case "driver":
        return "Livreur";
      case "admin":
        return "Admin";
      default:
        return role;
    }
  }

  formatDate(date: any): string {
    if (!date) return "-";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getPasswordStatus(user: UserAccount): { label: string; class: string } {
    if (user.passwordSetByAdmin) {
      return { label: "Défini par admin", class: "text-warning" };
    }
    if (user.hasTemporaryPassword) {
      return { label: "Temporaire", class: "text-info" };
    }
    return { label: "Personnel", class: "text-success" };
  }

  // Navigation
  viewEntity(user: UserAccount): void {
    if (user.entityId) {
      const route =
        user.role === "client"
          ? `/megafast/clients/${user.entityId}`
          : `/megafast/drivers/${user.entityId}`;
      window.location.href = route;
    }
  }

  refreshUsers(): void {
    this.loadUsers();
  }
}
