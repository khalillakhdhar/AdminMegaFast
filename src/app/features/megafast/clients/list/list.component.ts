import { Component, OnInit, ViewChild, TemplateRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from "@angular/forms";
import { BsModalRef, BsModalService, ModalModule } from "ngx-bootstrap/modal";
import { PaginationModule } from "ngx-bootstrap/pagination";
import { ToastrService } from "ngx-toastr";

import { Client } from "../../../../core/models/client.model";
import { ClientService } from "../../../../core/services/client.service";
import { PageTitleComponent } from "../../../../shared/ui/pagetitle/pagetitle.component";

interface ClientStats {
  totalOrders: number;
  totalValue: number;
  lastOrderDate?: Date;
  avgOrderValue: number;
}

@Component({
  selector: "app-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ModalModule,
    PaginationModule,
    PageTitleComponent,
  ],
  templateUrl: "./list.component.html",
  styleUrl: "./list.component.scss",
})
export class ListComponent implements OnInit {
  @ViewChild("newClientModal") newClientModal?: TemplateRef<any>;
  @ViewChild("deleteClientModal") deleteClientModal?: TemplateRef<any>;

  // Breadcrumb
  breadCrumbItems = [{ label: "Clients", active: true }];

  // Data
  clients: Client[] = [];
  filteredClients: Client[] = [];
  clientStats: { [key: string]: ClientStats } = {};

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Modals
  modalRef?: BsModalRef;
  clientForm: FormGroup;
  selectedClient?: Client;
  isEditMode = false;
  deleteClientId?: string;
  createAccountClientId?: string;

  // Account creation
  createAccountOption = false;

  // Search & Filter
  searchTerm = "";
  sortField = "createdAt";
  sortDirection: "asc" | "desc" = "desc";

  // Loading states
  loading = false;
  loadingStats = false;

  constructor(
    private readonly clientService: ClientService,
    private readonly modalService: BsModalService,
    private readonly fb: FormBuilder,
    private readonly toastr: ToastrService
  ) {
    this.clientForm = this.createClientForm();
  }

  ngOnInit(): void {
    this.loadClients();
    this.loadClientStats();
  }

  createClientForm(): FormGroup {
    return this.fb.group({
      name: ["", [Validators.required, Validators.minLength(2)]],
      email: ["", [Validators.email]],
      phone: [""],
      company: [""],
      vatNumber: [""],
      address: this.fb.group({
        line1: [""],
        line2: [""],
        city: [""],
        delegation: [""],
        postalCode: [""],
        country: ["Tunisie"],
      }),
      notes: [""],
      createAccount: [false], // Option for account creation
      adminPassword: [""], // Admin-defined password (optional)
      useAdminPassword: [false], // Toggle for using admin-defined password
    });
  }

  /**
   * Generate a secure random password
   */
  generatePassword(): void {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghjkmnpqrstuvwxyz";
    const numbers = "23456789";
    const all = uppercase + lowercase + numbers;

    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    for (let i = password.length; i < 8; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    const shuffled = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
    this.clientForm.patchValue({ adminPassword: shuffled });
    this.toastr.info(`Mot de passe généré: ${shuffled}`, "Mot de passe", {
      timeOut: 5000,
    });
  }

  loadClients(): void {
    this.loading = true;
    this.clientService
      .list({
        orderBy: this.sortField as "createdAt" | "name",
        dir: this.sortDirection,
      })
      .subscribe({
        next: (clients) => {
          this.clients = clients;
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error("Erreur lors du chargement des clients:", error);
          this.toastr.error("Erreur lors du chargement des clients");
          this.loading = false;
        },
      });
  }

  loadClientStats(): void {
    this.loadingStats = true;
    // Mock stats - à remplacer par un vrai service
    setTimeout(() => {
      this.clients.forEach((client) => {
        if (client.id) {
          this.clientStats[client.id] = {
            totalOrders: Math.floor(Math.random() * 50),
            totalValue: Math.floor(Math.random() * 50000),
            lastOrderDate: new Date(
              Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
            ),
            avgOrderValue: Math.floor(Math.random() * 1000),
          };
        }
      });
      this.loadingStats = false;
    }, 1000);
  }

  applyFilters(): void {
    let filtered = [...this.clients];

    // Recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(term) ||
          client.email?.toLowerCase().includes(term) ||
          client.phone?.includes(term) ||
          client.company?.toLowerCase().includes(term)
      );
    }

    this.filteredClients = filtered;
    this.totalItems = filtered.length;
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value;
    this.applyFilters();
    this.currentPage = 1;
  }

  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortField = field;
      this.sortDirection = "asc";
    }
    this.loadClients();
  }

  pageChanged(event: any): void {
    this.currentPage = event.page;
  }

  getPaginatedClients(): Client[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredClients.slice(start, end);
  }

  openNewClientModal(): void {
    this.isEditMode = false;
    this.selectedClient = undefined;
    this.clientForm.reset();
    this.clientForm.patchValue({
      address: { country: "Tunisie" },
      createAccount: false,
    });
    if (this.newClientModal) {
      this.modalRef = this.modalService.show(this.newClientModal);
    }
  }

  openEditClientModal(client: Client): void {
    this.isEditMode = true;
    this.selectedClient = client;
    this.clientForm.patchValue(client);
    if (this.newClientModal) {
      this.modalRef = this.modalService.show(this.newClientModal);
    }
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      Object.keys(this.clientForm.controls).forEach((key) => {
        const control = this.clientForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    const formValue = this.clientForm.value;
    const createAccount = formValue.createAccount;
    const useAdminPassword = formValue.useAdminPassword;
    const adminPassword = formValue.adminPassword;

    // Remove form-specific fields from client data
    const {
      createAccount: _,
      adminPassword: __,
      useAdminPassword: ___,
      ...clientData
    } = formValue;

    // Validate email if creating account
    if (createAccount && !clientData.email) {
      this.toastr.error("L'email est requis pour créer un compte utilisateur");
      return;
    }

    // Validate password if admin-defined password is enabled
    if (
      createAccount &&
      useAdminPassword &&
      (!adminPassword || adminPassword.length < 6)
    ) {
      this.toastr.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (this.isEditMode && this.selectedClient?.id) {
      this.clientService
        .update(this.selectedClient.id, clientData)
        .then(() => {
          this.toastr.success("Client modifié avec succès");
          this.modalRef?.hide();
          this.loadClients();
        })
        .catch((error) => {
          console.error("Erreur lors de la modification:", error);
          this.toastr.error("Erreur lors de la modification du client");
        });
    } else {
      // Use the new createWithAccount method with optional admin password
      const passwordToUse =
        useAdminPassword && adminPassword ? adminPassword : undefined;
      this.clientService
        .createWithAccount(clientData, createAccount, passwordToUse)
        .then(() => {
          this.modalRef?.hide();
          this.loadClients();
        })
        .catch((error) => {
          console.error("Erreur lors de la création:", error);
          this.toastr.error(
            "Erreur lors de la création du client: " + (error.message || error)
          );
        });
    }
  }

  openDeleteModal(clientId: string): void {
    this.deleteClientId = clientId;
    if (this.deleteClientModal) {
      this.modalRef = this.modalService.show(this.deleteClientModal);
    }
  }

  confirmDelete(): void {
    if (this.deleteClientId) {
      this.clientService
        .delete(this.deleteClientId)
        .then(() => {
          this.toastr.success("Client supprimé avec succès");
          this.modalRef?.hide();
          this.loadClients();
        })
        .catch((error) => {
          console.error("Erreur lors de la suppression:", error);
          this.toastr.error("Erreur lors de la suppression du client");
        });
    }
  }

  exportToExcel(): void {
    // Export functionality will be implemented with xlsx library
    this.toastr.info("Export Excel en cours de développement");
  }

  exportToPDF(): void {
    // Export functionality will be implemented with jsPDF library
    this.toastr.info("Export PDF en cours de développement");
  }

  getStatusClass(client: Client): string {
    return client.isActive !== false ? "badge bg-success" : "badge bg-danger";
  }

  getStatusText(client: Client): string {
    return client.isActive !== false ? "Actif" : "Inactif";
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency: "TND",
    }).format(value);
  }

  getActiveClientsCount(): number {
    return this.clients.filter((c) => c.isActive !== false).length;
  }

  getNewClientsCount(): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.clients.filter((c) => {
      const createdDate = c.createdAt?.toDate?.() || c.createdAt;
      return new Date(createdDate) > thirtyDaysAgo;
    }).length;
  }

  getTotalValue(): number {
    return Object.values(this.clientStats).reduce(
      (sum, stat) => sum + stat.totalValue,
      0
    );
  }

  /**
   * Create account for existing client
   */
  createAccountForClient(clientId: string): void {
    this.createAccountClientId = clientId;
    const client = this.clients.find((c) => c.id === clientId);

    if (!client) {
      this.toastr.error("Client non trouvé");
      return;
    }

    if (!client.email) {
      this.toastr.error("L'email du client est requis pour créer un compte");
      return;
    }

    if (client.hasAccount) {
      this.toastr.warning("Ce client a déjà un compte utilisateur");
      return;
    }

    // Confirm account creation
    if (
      confirm(
        `Créer un compte utilisateur pour ${client.name} (${client.email}) ?`
      )
    ) {
      this.clientService
        .createAccountForClient(clientId)
        .then(() => {
          this.loadClients();
        })
        .catch((error) => {
          this.toastr.error(
            "Erreur lors de la création du compte: " + (error.message || error)
          );
        });
    }
  }

  /**
   * Reset client password
   */
  resetClientPassword(clientId: string): void {
    const client = this.clients.find((c) => c.id === clientId);

    if (!client) {
      this.toastr.error("Client non trouvé");
      return;
    }

    if (!client.hasAccount) {
      this.toastr.error("Ce client n'a pas de compte utilisateur");
      return;
    }

    // Confirm password reset
    if (
      confirm(
        `Envoyer un email de réinitialisation du mot de passe à ${client.name} (${client.email}) ?`
      )
    ) {
      this.clientService
        .resetClientPassword(clientId)
        .then(() => {
          // Success message is shown by the service
        })
        .catch((error) => {
          this.toastr.error(
            "Erreur lors de la réinitialisation: " + (error.message || error)
          );
        });
    }
  }

  /**
   * Disable client account
   */
  disableClientAccount(clientId: string): void {
    const client = this.clients.find((c) => c.id === clientId);

    if (!client) {
      this.toastr.error("Client non trouvé");
      return;
    }

    if (!client.hasAccount) {
      this.toastr.error("Ce client n'a pas de compte utilisateur");
      return;
    }

    // Confirm account disabling
    if (confirm(`Désactiver le compte utilisateur de ${client.name} ?`)) {
      this.clientService
        .disableAccount(clientId)
        .then(() => {
          this.loadClients();
        })
        .catch((error) => {
          this.toastr.error(
            "Erreur lors de la désactivation: " + (error.message || error)
          );
        });
    }
  }

  /**
   * Enable client account
   */
  enableClientAccount(clientId: string): void {
    const client = this.clients.find((c) => c.id === clientId);

    if (!client) {
      this.toastr.error("Client non trouvé");
      return;
    }

    if (!client.hasAccount) {
      this.toastr.error("Ce client n'a pas de compte utilisateur");
      return;
    }

    // Confirm account enabling
    if (confirm(`Réactiver le compte utilisateur de ${client.name} ?`)) {
      this.clientService
        .enableAccount(clientId)
        .then(() => {
          this.loadClients();
        })
        .catch((error) => {
          this.toastr.error(
            "Erreur lors de la réactivation: " + (error.message || error)
          );
        });
    }
  }

  /**
   * Check if client has account
   */
  hasAccount(client: Client): boolean {
    return !!client.hasAccount;
  }

  /**
   * Get account status text
   */
  getAccountStatusText(client: Client): string {
    if (client.hasAccount) {
      return client.isActive ? "Compte actif" : "Compte désactivé";
    }
    return "Pas de compte";
  }

  /**
   * Get account status class
   */
  getAccountStatusClass(client: Client): string {
    if (client.hasAccount) {
      return client.isActive ? "badge bg-success" : "badge bg-warning";
    }
    return "badge bg-secondary";
  }
}
