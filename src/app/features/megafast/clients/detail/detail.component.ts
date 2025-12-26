import { Component, OnInit, ViewChild, TemplateRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { BsModalRef, BsModalService, ModalModule } from "ngx-bootstrap/modal";
import { ToastrService } from "ngx-toastr";
import { NgApexchartsModule } from "ng-apexcharts";

import { Client } from "../../../../core/models/client.model";
import { ClientService } from "../../../../core/services/client.service";
import { PageTitleComponent } from "../../../../shared/ui/pagetitle/pagetitle.component";

interface OrderHistory {
  id: string;
  date: Date;
  amount: number;
  status: "completed" | "pending" | "cancelled";
  items: number;
}

interface ClientStats {
  totalOrders: number;
  totalValue: number;
  avgOrderValue: number;
  lastOrderDate?: Date;
  monthlyOrders: { month: string; orders: number; value: number }[];
  recentOrders: OrderHistory[];
}

@Component({
  selector: "app-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ModalModule,
    NgApexchartsModule,
    PageTitleComponent,
  ],
  templateUrl: "./detail.component.html",
  styleUrl: "./detail.component.scss",
})
export class DetailComponent implements OnInit {
  @ViewChild("editClientModal") editClientModal?: TemplateRef<any>;
  @ViewChild("addNoteModal") addNoteModal?: TemplateRef<any>;

  // Data
  client?: Client;
  clientStats?: ClientStats;
  clientId?: string;
  loading = false;
  loadingStats = false;

  // Forms
  clientForm: FormGroup;
  noteForm: FormGroup;
  modalRef?: BsModalRef;

  // Breadcrumb
  breadCrumbItems = [
    { label: "Clients", link: "/clients" },
    { label: "Détail", active: true },
  ];

  // Charts configuration
  ordersChartOptions: any = {};
  revenueChartOptions: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    private modalService: BsModalService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.clientForm = this.createClientForm();
    this.noteForm = this.createNoteForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.clientId = params["id"];
      if (this.clientId) {
        this.loadClient();
        this.loadClientStats();
      }
    });
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
      isActive: [true],
    });
  }

  createNoteForm(): FormGroup {
    return this.fb.group({
      note: ["", [Validators.required, Validators.minLength(5)]],
    });
  }

  loadClient(): void {
    if (!this.clientId) return;

    this.loading = true;
    this.clientService.getById(this.clientId).subscribe({
      next: (client) => {
        if (client) {
          this.client = client;
          this.breadCrumbItems[1].label = client.name;
          this.clientForm.patchValue(client);
        } else {
          this.toastr.error("Client non trouvé");
          this.router.navigate(["/clients"]);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error("Erreur lors du chargement du client:", error);
        this.toastr.error("Erreur lors du chargement du client");
        this.loading = false;
      },
    });
  }

  loadClientStats(): void {
    if (!this.clientId) return;

    this.loadingStats = true;

    // Mock data - à remplacer par un vrai service
    setTimeout(() => {
      const mockOrders: OrderHistory[] = Array.from({ length: 12 }, (_, i) => ({
        id: `ORD-${String(i + 1).padStart(3, "0")}`,
        date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
        amount: Math.floor(Math.random() * 2000) + 100,
        status: ["completed", "pending", "cancelled"][
          Math.floor(Math.random() * 3)
        ] as any,
        items: Math.floor(Math.random() * 10) + 1,
      }));

      const monthlyStats = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          month: date.toLocaleDateString("fr-FR", {
            month: "short",
            year: "2-digit",
          }),
          orders: Math.floor(Math.random() * 20) + 5,
          value: Math.floor(Math.random() * 10000) + 2000,
        };
      }).reverse();

      this.clientStats = {
        totalOrders: mockOrders.length,
        totalValue: mockOrders.reduce((sum, order) => sum + order.amount, 0),
        avgOrderValue:
          mockOrders.reduce((sum, order) => sum + order.amount, 0) /
          mockOrders.length,
        lastOrderDate: mockOrders[0]?.date,
        monthlyOrders: monthlyStats,
        recentOrders: mockOrders.slice(0, 5),
      };

      this.setupCharts();
      this.loadingStats = false;
    }, 1000);
  }

  setupCharts(): void {
    if (!this.clientStats) return;

    // Orders Chart
    this.ordersChartOptions = {
      series: [
        {
          name: "Commandes",
          data: this.clientStats.monthlyOrders.map((m) => m.orders),
        },
      ],
      chart: {
        type: "line",
        height: 300,
        toolbar: { show: false },
      },
      colors: ["#556ee6"],
      xaxis: {
        categories: this.clientStats.monthlyOrders.map((m) => m.month),
      },
      yaxis: {
        title: { text: "Nombre de commandes" },
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      markers: {
        size: 6,
      },
      grid: {
        borderColor: "#f1f1f1",
      },
    };

    // Revenue Chart
    this.revenueChartOptions = {
      series: [
        {
          name: "Chiffre d'affaires",
          data: this.clientStats.monthlyOrders.map((m) => m.value),
        },
      ],
      chart: {
        type: "area",
        height: 300,
        toolbar: { show: false },
      },
      colors: ["#34c38f"],
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
        },
      },
      xaxis: {
        categories: this.clientStats.monthlyOrders.map((m) => m.month),
      },
      yaxis: {
        title: { text: "Montant (TND)" },
        labels: {
          formatter: (value: number) => this.formatCurrency(value),
        },
      },
      stroke: {
        curve: "smooth",
        width: 2,
      },
      grid: {
        borderColor: "#f1f1f1",
      },
    };
  }

  openEditModal(): void {
    if (this.client) {
      this.clientForm.patchValue(this.client);
      this.modalRef = this.modalService.show(this.editClientModal!);
    }
  }

  saveClient(): void {
    if (this.clientForm.invalid || !this.client?.id) return;

    const clientData = this.clientForm.value;

    this.clientService
      .update(this.client.id, clientData)
      .then(() => {
        this.toastr.success("Client modifié avec succès");
        this.modalRef?.hide();
        this.loadClient();
      })
      .catch((error) => {
        console.error("Erreur lors de la modification:", error);
        this.toastr.error("Erreur lors de la modification du client");
      });
  }

  openAddNoteModal(): void {
    this.noteForm.reset();
    this.modalRef = this.modalService.show(this.addNoteModal!);
  }

  addNote(): void {
    if (this.noteForm.invalid || !this.client?.id) return;

    const noteText = this.noteForm.get("note")?.value;
    const currentNotes = this.client.notes || "";
    const timestamp = new Date().toLocaleDateString("fr-FR");
    const newNote = `[${timestamp}] ${noteText}`;
    const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;

    this.clientService
      .update(this.client.id, { notes: updatedNotes })
      .then(() => {
        this.toastr.success("Note ajoutée avec succès");
        this.modalRef?.hide();
        this.loadClient();
      })
      .catch((error) => {
        console.error("Erreur lors de l'ajout de la note:", error);
        this.toastr.error("Erreur lors de l'ajout de la note");
      });
  }

  toggleClientStatus(): void {
    if (!this.client?.id) return;

    const newStatus = !this.client.isActive;

    this.clientService
      .update(this.client.id, { isActive: newStatus })
      .then(() => {
        this.toastr.success(
          `Client ${newStatus ? "activé" : "désactivé"} avec succès`
        );
        this.loadClient();
      })
      .catch((error) => {
        console.error("Erreur lors du changement de statut:", error);
        this.toastr.error("Erreur lors du changement de statut");
      });
  }

  deleteClient(): void {
    if (!this.client?.id) return;

    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible."
      )
    ) {
      this.clientService
        .delete(this.client.id)
        .then(() => {
          this.toastr.success("Client supprimé avec succès");
          this.router.navigate(["/clients"]);
        })
        .catch((error) => {
          console.error("Erreur lors de la suppression:", error);
          this.toastr.error("Erreur lors de la suppression du client");
        });
    }
  }

  exportClientData(): void {
    if (!this.client) {
      this.toastr.error("Aucun client à exporter");
      return;
    }

    // Prepare export data
    const exportData = {
      client: {
        id: this.client.id,
        name: this.client.name,
        email: this.client.email || "",
        phone: this.client.phone || "",
        company: this.client.company || "",
        vatNumber: this.client.vatNumber || "",
        address: this.client.address || {},
        isActive: this.client.isActive,
        notes: this.client.notes || "",
        createdAt: this.client.createdAt,
      },
      statistics: this.clientStats
        ? {
            totalOrders: this.clientStats.totalOrders,
            totalValue: this.formatCurrency(this.clientStats.totalValue),
            avgOrderValue: this.formatCurrency(this.clientStats.avgOrderValue),
            lastOrderDate:
              this.clientStats.lastOrderDate?.toLocaleDateString("fr-FR") ||
              "N/A",
          }
        : null,
      recentOrders:
        this.clientStats?.recentOrders.map((order) => ({
          id: order.id,
          date: order.date.toLocaleDateString("fr-FR"),
          amount: this.formatCurrency(order.amount),
          status: order.status,
          items: order.items,
        })) || [],
      exportDate: new Date().toISOString(),
    };

    // Create JSON blob and download
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `client_${this.client.name.replace(/\s+/g, "_")}_${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    window.URL.revokeObjectURL(url);
    this.toastr.success("Données client exportées avec succès");
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency: "TND",
    }).format(value);
  }

  getStatusClass(): string {
    return this.client?.isActive !== false
      ? "badge bg-success"
      : "badge bg-danger";
  }

  getStatusText(): string {
    return this.client?.isActive !== false ? "Actif" : "Inactif";
  }

  getOrderStatusClass(status: string): string {
    switch (status) {
      case "completed":
        return "badge bg-success";
      case "pending":
        return "badge bg-warning";
      case "cancelled":
        return "badge bg-danger";
      default:
        return "badge bg-secondary";
    }
  }

  getOrderStatusText(status: string): string {
    switch (status) {
      case "completed":
        return "Complétée";
      case "pending":
        return "En attente";
      case "cancelled":
        return "Annulée";
      default:
        return "Inconnue";
    }
  }
}
