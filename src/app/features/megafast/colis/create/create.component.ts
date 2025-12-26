import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterModule, ActivatedRoute } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { NgSelectModule } from "@ng-select/ng-select";

import { PageTitleComponent } from "../../../../shared/ui/pagetitle/pagetitle.component";
import { TUNISIA_CITIES } from "../../../../shared/data/tunisia-cities";
import { ShipmentService } from "../../../../core/services/shipment.service";
import { DriverService } from "../../../../core/services/driver.service";
import { ClientService } from "../../../../core/services/client.service";
import {
  TunisiaLocationsService,
  TunisianGovernorate,
  TunisianDelegation,
} from "../../../../core/services/tunisia-locations.service";
import { Shipment } from "../../../../core/models/shipment.model";
import { Driver } from "../../../../core/models/driver.model";
import { Client } from "../../../../core/models/client.model";
import {
  Recipient,
  RecipientFormData,
} from "../../../../core/models/recipient.model";
import {
  ShipmentPrintService,
  DriverMin,
} from "../../../../core/services/shipment-print.service";
import { Subscription, take } from "rxjs";

@Component({
  selector: "app-colis-create",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgSelectModule,
    PageTitleComponent,
  ],
  templateUrl: "./create.component.html",
  styleUrls: ["./create.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateComponent implements OnInit, OnDestroy {
  // Wizard
  step = 1;

  // City options
  cities = TUNISIA_CITIES;

  // Tunisia locations
  governorates: TunisianGovernorate[] = [];
  selectedGovernorate: TunisianGovernorate | null = null;
  delegations: TunisianDelegation[] = [];

  // Pickup governorate and delegation
  pickupGovernorates: TunisianGovernorate[] = [];
  selectedPickupGovernorate: TunisianGovernorate | null = null;
  pickupDelegations: TunisianDelegation[] = [];

  // Delivery governorate and delegation (for recipient)
  deliveryGovernorates: TunisianGovernorate[] = [];
  selectedDeliveryGovernorate: TunisianGovernorate | null = null;
  deliveryDelegations: TunisianDelegation[] = [];

  // Data
  drivers: Driver[] = [];
  clients: Client[] = [];
  selectedClient: Client | null = null;

  // Client mode: 'existing' | 'new'
  clientMode: "existing" | "new" = "existing";

  // Form
  form: FormGroup;

  // Derived
  subtotal = 0;
  totalQty = 0;
  grandTotal = 0;
  grandTotalWithoutFee = 0;

  // UI
  saving = false;
  breadCrumbItems = [
    { label: "Colis", link: "/megafast/colis" },
    { label: "Créer", active: true },
  ];

  private sub?: Subscription;

  // Services injectés
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly shipmentService = inject(ShipmentService);
  private readonly driverService = inject(DriverService);
  private readonly clientService = inject(ClientService);
  private readonly tunisiaService = inject(TunisiaLocationsService);
  private readonly printService = inject(ShipmentPrintService);

  // Edition properties
  isEditMode = false;
  shipmentId: string | null = null;
  originalShipment: Shipment | null = null;

  constructor() {
    this.form = this.fb.group({
      // Step 1: Client (Sender) - Mode selection
      clientMode: ["existing"], // 'existing' | 'new'
      clientId: [""],
      clientName: ["", [Validators.required, Validators.minLength(2)]],
      clientPhone: ["", [Validators.required, Validators.minLength(6)]],
      clientEmail: [""],
      clientCompany: [""],

      // Step 1bis: Adresse de récupération (pickup)
      pickupAddress: ["", [Validators.required, Validators.minLength(3)]],
      pickupGovernorate: ["", [Validators.required]],
      pickupDelegation: [""],

      // Step 2: Destinataire (Recipient)
      recipientName: ["", [Validators.required, Validators.minLength(2)]],
      recipientPhone: ["", [Validators.required, Validators.minLength(6)]],
      recipientEmail: [""],
      recipientCompany: [""],
      recipientAddressLine1: [
        "",
        [Validators.required, Validators.minLength(3)],
      ],
      recipientAddressLine2: [""],
      recipientGovernorate: ["", [Validators.required]],
      recipientDelegation: [""],
      recipientPostalCode: [""],
      recipientNotes: [""],

      // Step 3: Produits
      items: this.fb.array([this.newItem()]),

      // Step 4: Livraison & Frais + Livreur
      notes: [""],
      paymentMode: ["cod", Validators.required],
      weight: [0, [Validators.min(0)]],

      // Frais de livraison saisis (un seul montant)
      deliveryFee: [0, [Validators.required, Validators.min(0)]],
      includeFeeInTotal: [true], // Option pour inclure/exclure les frais du total

      // Livreur assigné (optionnel)
      driverId: [""],
    });
  }

  ngOnInit(): void {
    // Check edit mode
    this.shipmentId = this.route.snapshot.paramMap.get("id");
    this.isEditMode = !!this.shipmentId;

    if (this.isEditMode) {
      this.breadCrumbItems = [
        { label: "Colis", link: "/megafast/colis" },
        { label: "Modifier", active: true },
      ];
    }

    // Load data
    this.sub = new Subscription();
    this.sub.add(
      this.driverService.getAll().subscribe((ds) => {
        this.drivers = ds || [];
        this.cdr.markForCheck();
      })
    );

    this.sub.add(
      this.clientService.list({ limit: 200 }).subscribe((cs) => {
        this.clients = cs || [];
        this.cdr.markForCheck();
      })
    );

    // Load Tunisia locations
    this.governorates = this.tunisiaService.getGovernorates();
    this.pickupGovernorates = this.tunisiaService.getGovernorates();
    this.deliveryGovernorates = this.tunisiaService.getGovernorates();

    // Watch clientMode changes in form
    const clientModeControl = this.form.get("clientMode");
    if (clientModeControl) {
      this.sub.add(
        clientModeControl.valueChanges.subscribe((mode) => {
          this.clientMode = mode;
          this.cdr.markForCheck();
        })
      );
    }

    // Recompute totals & fees on key changes
    const recompute = () => {
      this.computeDerived();
    };
    this.sub.add(this.items.valueChanges.subscribe(recompute));
    const weight = this.form.get("weight");
    if (weight) this.sub.add(weight.valueChanges.subscribe(recompute));
    const deliveryFee = this.form.get("deliveryFee");
    if (deliveryFee)
      this.sub.add(deliveryFee.valueChanges.subscribe(recompute));

    const includeFeeInTotal = this.form.get("includeFeeInTotal");
    if (includeFeeInTotal)
      this.sub.add(includeFeeInTotal.valueChanges.subscribe(recompute));

    // Watch governorate changes
    const governorateControl = this.form.get("governorate");
    if (governorateControl) {
      this.sub.add(
        governorateControl.valueChanges.subscribe((code) => {
          this.onGovernorateChange(code);
        })
      );
    }

    const pickupGovernorateControl = this.form.get("pickupGovernorate");
    if (pickupGovernorateControl) {
      this.sub.add(
        pickupGovernorateControl.valueChanges.subscribe((code) => {
          this.onPickupGovernorateChange(code);
        })
      );
    }

    const recipientGovernorateControl = this.form.get("recipientGovernorate");
    if (recipientGovernorateControl) {
      this.sub.add(
        recipientGovernorateControl.valueChanges.subscribe((code) => {
          this.onRecipientGovernorateChange(code);
        })
      );
    }

    // Load existing shipment data if edit mode
    if (this.isEditMode && this.shipmentId) {
      this.loadShipmentForEdit(this.shipmentId);
    }

    // Initial compute
    this.computeDerived();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // -- Form helpers
  get items(): FormArray<FormGroup> {
    return this.form.get("items") as any;
  }

  newItem(): FormGroup {
    return this.fb.group({
      name: ["", Validators.required],
      qty: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      unitWeight: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addItem() {
    this.items.push(this.newItem());
    this.computeDerived();
    // Mark new item as touched to show validation immediately if empty
    const newItemIndex = this.items.length - 1;
    setTimeout(() => this.markItemAsTouched(newItemIndex), 100);
  }

  removeItem(i: number) {
    if (this.items.length > 1) {
      this.items.removeAt(i);
      this.computeDerived();
    }
  }

  // Validate specific item field
  validateItemField(itemIndex: number, fieldName: string): void {
    const item = this.items.at(itemIndex);
    if (item) {
      const field = item.get(fieldName);
      if (field) {
        field.markAsTouched();
        field.updateValueAndValidity();
        this.cdr.markForCheck();
      }
    }
  }

  // Mark all fields of an item as touched
  markItemAsTouched(itemIndex: number): void {
    const item = this.items.at(itemIndex);
    if (item) {
      Object.keys(item.controls).forEach((key) => {
        item.get(key)?.markAsTouched();
      });
      this.cdr.markForCheck();
    }
  }

  // Check if there are errors in items
  hasItemsErrors(): boolean {
    return this.items.controls.some(
      (item) => item.invalid && (item.touched || item.dirty)
    );
  }

  // Get detailed error messages for items
  getItemsErrorMessages(): string[] {
    const errors: string[] = [];
    this.items.controls.forEach((item, index) => {
      if (item.invalid && (item.touched || item.dirty)) {
        const itemNumber = index + 1;
        if (item.get("name")?.errors) {
          errors.push(`Produit ${itemNumber} : Le nom est requis`);
        }
        if (item.get("qty")?.errors) {
          errors.push(
            `Produit ${itemNumber} : La quantité doit être au moins 1`
          );
        }
        if (item.get("unitPrice")?.errors) {
          errors.push(
            `Produit ${itemNumber} : Le prix doit être supérieur ou égal à 0`
          );
        }
        if (item.get("unitWeight")?.errors) {
          errors.push(
            `Produit ${itemNumber} : Le poids doit être supérieur ou égal à 0`
          );
        }
      }
    });
    return errors;
  }

  // -- Client selection
  onClientModeChange(mode: "existing" | "new") {
    this.clientMode = mode;
    if (mode === "new") {
      this.selectedClient = null;
      this.form.patchValue({
        clientId: "",
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        clientCompany: "",
      });
    } else if (mode === "existing") {
      // Clear manual client data when switching to existing mode
      this.form.patchValue({
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        clientCompany: "",
      });
    }
    this.cdr.markForCheck();
  }

  onClientSelect(clientId: string) {
    const client = this.clients.find((c) => c.id === clientId);
    this.selectedClient = client || null;

    if (client) {
      this.form.patchValue({
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        clientCompany: client.company,
      });

      // Auto-import client address if available
      if (client.address) {
        if (client.address.line1) {
          this.form.patchValue({
            pickupAddress:
              client.address.line1 +
              (client.address.line2 ? ", " + client.address.line2 : ""),
          });
        }

        // Try to find matching governorate
        if (client.address.city) {
          const matchingGov = this.pickupGovernorates.find(
            (g) =>
              g.name.toLowerCase() === client.address!.city!.toLowerCase() ||
              g.arabicName === client.address!.city
          );
          if (matchingGov) {
            this.form.patchValue({ pickupGovernorate: matchingGov.code });
            this.onPickupGovernorateChange(matchingGov.code);

            // Try to find matching delegation
            if (client.address.delegation) {
              const matchingDel = this.pickupDelegations.find(
                (d) =>
                  d.name.toLowerCase() ===
                    client.address!.delegation!.toLowerCase() ||
                  d.arabicName === client.address!.delegation
              );
              if (matchingDel) {
                this.form.patchValue({ pickupDelegation: matchingDel.code });
              }
            }
          }
        }
      }

      // Try to import GPS coordinates if available (future feature)
      // This would require extending Client model to include GPS coordinates

      this.cdr.markForCheck();
    }
  }

  clearClientSelection() {
    this.selectedClient = null;
    this.form.patchValue({
      clientId: "",
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      clientCompany: "",
    });
    this.cdr.markForCheck();
  }

  // -- Location handlers
  onGovernorateChange(governorateCode: string) {
    this.selectedGovernorate =
      this.governorates.find((g) => g.code === governorateCode) || null;
    this.delegations = this.selectedGovernorate
      ? this.selectedGovernorate.delegations
      : [];
    this.form.patchValue({ delegation: "" });
    this.cdr.markForCheck();
  }

  onDeliveryGovernorateChange(event: any) {
    const governorateCode = event.target ? event.target.value : event;
    this.selectedGovernorate = this.governorates.find(
      (g) => g.code === governorateCode
    );
    this.delegations = this.tunisiaService.getDelegations(governorateCode);

    // Reset delegation when governorate changes
    this.form.patchValue({ delegation: "" });
  }

  onPickupGovernorateChange(event: any) {
    const governorateCode = event.target ? event.target.value : event;
    this.selectedPickupGovernorate = this.pickupGovernorates.find(
      (g) => g.code === governorateCode
    );
    this.pickupDelegations =
      this.tunisiaService.getDelegations(governorateCode);

    // Reset delegation when governorate changes
    this.form.patchValue({ pickupDelegation: "" });
  }

  onRecipientGovernorateChange(event: any) {
    const governorateCode = event.target ? event.target.value : event;
    this.selectedDeliveryGovernorate = this.deliveryGovernorates.find(
      (g) => g.code === governorateCode
    );
    this.deliveryDelegations =
      this.tunisiaService.getDelegations(governorateCode);

    // Reset delegation when governorate changes
    this.form.patchValue({ recipientDelegation: "" });
  }

  // -- Calculs
  private computeDerived() {
    this.subtotal = this.calcSubtotal();
    const autoWeight = this.calcWeightFromItems();

    // Only update weight if user hasn't manually set it (avoid conflicts with validation)
    const weightCtrl = this.form.get("weight");
    if (weightCtrl && (weightCtrl.value === 0 || weightCtrl.value === null)) {
      // Don't emit events to avoid triggering validation loops
      weightCtrl.setValue(autoWeight, { emitEvent: false });
    }

    this.totalQty = this.calcTotalQty();

    const fee = Number(this.form.get("deliveryFee")?.value || 0);
    const includeFeeInTotal = this.form.get("includeFeeInTotal")?.value;

    // Calcul du total sans frais
    this.grandTotalWithoutFee = this.subtotal;

    // Calcul du total avec ou sans frais selon l'option
    this.grandTotal = includeFeeInTotal ? this.subtotal + fee : this.subtotal;

    this.cdr.markForCheck();
  }

  private calcSubtotal(): number {
    return this.items.controls.reduce(
      (sum, g: any) => sum + Number(g.value.qty) * Number(g.value.unitPrice),
      0
    );
  }
  private calcTotalQty(): number {
    return this.items.controls.reduce(
      (sum, g: any) => sum + Number(g.value.qty),
      0
    );
  }

  // Getter pour les frais de livraison
  get deliveryFee(): number {
    return Number(this.form.get("deliveryFee")?.value || 0);
  }

  // Getter pour savoir si les frais sont inclus dans le total
  get includeFeeInTotal(): boolean {
    return this.form.get("includeFeeInTotal")?.value === true;
  }

  // Getter pour le total avec frais (toujours)
  get totalWithFees(): number {
    return this.subtotal + this.deliveryFee;
  }
  private calcWeightFromItems(): number {
    return this.items.controls.reduce(
      (sum, g: any) => sum + Number(g.value.qty) * Number(g.value.unitWeight),
      0
    );
  }

  // removed fee breakdown: single deliveryFee is entered by user

  // -- Wizard navigation
  next() {
    if (this.canProceedToNextStep()) {
      if (this.step < 6) this.step++;
    } else {
      this.markFormGroupTouched();

      // Show specific error message for products step
      if (this.step === 3) {
        const itemsErrors = this.getItemsErrorMessages();
        if (itemsErrors.length > 0) {
          this.toastr.warning(
            "Veuillez corriger les erreurs dans les produits",
            "Erreurs de validation"
          );
        } else {
          this.toastr.warning("Veuillez ajouter au moins un produit valide");
        }
      } else {
        this.toastr.warning("Veuillez corriger les erreurs avant de continuer");
      }
    }
  }
  prev() {
    if (this.step > 1) this.step--;
  }
  goToStep(stepNumber: number) {
    this.step = stepNumber;
  }

  // Check if can proceed to next step
  canProceedToNextStep(): boolean {
    switch (this.step) {
      case 1:
        return (
          this.form.get("clientName")?.valid &&
          this.form.get("clientPhone")?.valid &&
          this.form.get("pickupAddress")?.valid &&
          this.form.get("pickupGovernorate")?.valid
        );
      case 2:
        return (
          this.form.get("recipientName")?.valid &&
          this.form.get("recipientPhone")?.valid &&
          this.form.get("recipientAddressLine1")?.valid &&
          this.form.get("recipientGovernorate")?.valid
        );
      case 3:
        // Force validation of all items
        this.items.controls.forEach((item, index) => {
          this.markItemAsTouched(index);
        });
        // Check if we have at least one item and all items are valid
        const hasValidItems = this.items.length > 0 && this.items.valid;
        return hasValidItems;
      case 4:
        const weightValid = this.form.get("weight")?.valid !== false;
        const deliveryFeeValid = this.form.get("deliveryFee")?.valid;
        return weightValid && deliveryFeeValid;
      case 5:
        return true; // No required fields in step 5
      default:
        return true;
    }
  }

  // Mark all form controls as touched to show validation errors
  markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control) {
        control.markAsTouched();
        if (control instanceof FormArray) {
          control.controls.forEach((c, index) => {
            if (c instanceof FormGroup) {
              Object.keys(c.controls).forEach((subKey) => {
                c.get(subKey)?.markAsTouched();
              });
            }
          });
        }
      }
    });

    // Force validation display for all items
    this.items.controls.forEach((item, index) => {
      this.markItemAsTouched(index);
    });

    this.cdr.markForCheck();
  }

  // Helper methods for template
  getDelegationName(delegationCode: string): string {
    const delegation = this.delegations.find((d) => d.code === delegationCode);
    return delegation ? delegation.name : "";
  }

  getPickupDelegationName(delegationCode: string): string {
    const delegation = this.pickupDelegations.find(
      (d) => d.code === delegationCode
    );
    return delegation ? delegation.name : "";
  }

  getDeliveryDelegationName(delegationCode: string): string {
    const delegation = this.deliveryDelegations.find(
      (d) => d.code === delegationCode
    );
    return delegation ? delegation.name : "";
  }

  // Debug method to identify invalid fields
  debugFormValidation(): string[] {
    const invalidFields: string[] = [];

    console.log("=== FORM VALIDATION DEBUG ===");
    console.log("Form valid:", this.form.valid);
    console.log("Form status:", this.form.status);

    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        console.log(`❌ ${key}:`, control.errors, "Value:", control.value);
        invalidFields.push(
          `${key} (${Object.keys(control.errors || {}).join(", ")})`
        );
      } else if (control && control.valid) {
        console.log(`✅ ${key}: valid`);
      }
    });

    // Check items array specifically
    console.log("Items array length:", this.items.length);
    console.log("Items array valid:", this.items.valid);
    this.items.controls.forEach((item, index) => {
      if (item.invalid) {
        console.log(`❌ Item ${index}:`, item.errors);
        Object.keys(item.controls).forEach((fieldKey) => {
          const field = item.get(fieldKey);
          if (field && field.invalid) {
            console.log(
              `  ❌ ${fieldKey}:`,
              field.errors,
              "Value:",
              field.value
            );
            invalidFields.push(
              `Item ${index} ${fieldKey} (${Object.keys(
                field.errors || {}
              ).join(", ")})`
            );
          }
        });
      } else {
        console.log(`✅ Item ${index}: valid`);
      }
    });

    console.log("=== END DEBUG ===");
    return invalidFields;
  }

  // -- Submit
  private buildPayload() {
    const v = this.form.getRawValue();
    const barcode = "MGF-" + Date.now();
    const items = v.items || [];
    const fees = { feeTotal: Number(v.deliveryFee || 0) };
    const meta = {
      items,
      fees,
      subtotal: this.subtotal,
      totalQty: this.totalQty,
      grandTotal: this.grandTotal,
    };
    const userNotes = (v.notes || "").trim();
    const notes = userNotes
      ? `${userNotes}\nMETA:${JSON.stringify(meta)}`
      : `META:${JSON.stringify(meta)}`;
    const payload: any = {
      barcode,
      status: "created",
      paymentMode: v.paymentMode,
      weight: Number(v.weight) || 0,
      notes,
    } as Shipment;

    // Append optional fields only when defined (Firestore rejects undefined)
    if (v.clientId) payload.clientId = v.clientId;
    if (v.clientName) payload.clientName = v.clientName;
    if (v.clientPhone) payload.clientPhone = v.clientPhone;
    if (v.address) payload.address = v.address;

    // Convert governorate/delegation codes to names for storage
    if (v.governorate) {
      const gov = this.governorates.find((g) => g.code === v.governorate);
      payload.city = gov ? gov.name : v.governorate;
    }
    if (v.delegation) {
      const del = this.delegations.find((d) => d.code === v.delegation);
      payload.delegation = del ? del.name : v.delegation;
    }

    // Pickup address fields
    if (v.pickupAddress) payload.pickupAddress = v.pickupAddress;
    if (v.pickupGovernorate) {
      const pickupGov = this.pickupGovernorates.find(
        (g) => g.code === v.pickupGovernorate
      );
      payload.pickupCity = pickupGov ? pickupGov.name : v.pickupGovernorate;
    }
    if (v.pickupDelegation) {
      const pickupDel = this.pickupDelegations.find(
        (d) => d.code === v.pickupDelegation
      );
      payload.pickupDelegation = pickupDel
        ? pickupDel.name
        : v.pickupDelegation;
    }
    return { payload, v };
  }

  private async handleDriverAssignment(newId: string, v: any): Promise<void> {
    // Simple assignation directe au livreur si spécifié
    if (v.driverId) {
      await this.shipmentService.assignToDriver(newId, v.driverId);
    }
  }

  private async maybePrint(
    print: boolean,
    newId: string,
    payload: Shipment,
    driverId?: string
  ) {
    if (!print) return;
    const createdShipment: Shipment = { id: newId, ...payload };
    let driverMin: DriverMin | undefined;
    if (driverId) {
      const d = this.drivers.find((x) => x.id === driverId);
      if (d) {
        const vehicleString = d.vehicle
          ? `${d.vehicle.brand || ""} ${d.vehicle.model || ""}`.trim() ||
            d.vehicle.licensePlate
          : "";
        driverMin = {
          id: d.id,
          name: d.displayName || d.name,
          phone: d.phone,
          vehicle: vehicleString,
        };
      }
    }

    // Note pour impression directe sans lot
    const detailNote = "Impression détaillée - assigné directement au livreur";
    createdShipment.notes = createdShipment.notes
      ? `${createdShipment.notes}\n\n${detailNote}`
      : detailNote;

    try {
      await this.printService.generateShipmentPdf(
        createdShipment,
        undefined,
        driverMin
      );
    } catch (error) {
      console.error("Erreur lors de l'impression:", error);
    }
  }

  // Load shipment data for editing
  async loadShipmentForEdit(shipmentId: string): Promise<void> {
    try {
      const shipment = await this.shipmentService
        .getById(shipmentId)
        .pipe(take(1))
        .toPromise();
      if (!shipment) {
        this.toastr.error("Colis introuvable");
        this.router.navigate(["/megafast/colis"]);
        return;
      }

      this.originalShipment = shipment;
      this.populateFormWithShipment(shipment);
      this.cdr.markForCheck();
    } catch (error) {
      console.error("Error loading shipment:", error);
      this.toastr.error("Erreur lors du chargement du colis");
    }
  }

  // Populate form with existing shipment data
  private populateFormWithShipment(shipment: Shipment): void {
    // Parse metadata
    let meta: any = {};
    if (shipment.notes?.includes("META:")) {
      try {
        const metaStart = shipment.notes.indexOf("META:") + 5;
        const metaString = shipment.notes.substring(metaStart);
        meta = JSON.parse(metaString);
      } catch (e) {
        console.warn("Failed to parse meta:", e);
      }
    }

    // Client info
    this.form.patchValue({
      clientMode: shipment.clientId ? "existing" : "new",
      clientId: shipment.clientId || "",
      clientName: shipment.clientName || "",
      clientPhone: shipment.clientPhone || "",
      clientEmail: shipment.clientEmail || "",

      // Pickup address
      pickupAddress: shipment.pickupAddress || "",
      pickupGovernorate: shipment.pickupCity || "",
      pickupDelegation: shipment.pickupDelegation || "",

      // Recipient
      recipientName: shipment.clientName || "",
      recipientPhone: shipment.clientPhone || "",
      recipientEmail: shipment.clientEmail || "",
      recipientAddressLine1: shipment.address || "",
      recipientGovernorate: shipment.city || "",
      recipientDelegation: shipment.delegation || "",

      // Shipment details
      notes: this.extractUserNotes(shipment.notes || ""),
      paymentMode: shipment.paymentMode || "cod",
      weight: shipment.weight || 0,

      // Driver assignment (direct assignment without batch)
      driverId: shipment.assignedTo || "",
    });

    // Set items
    if (meta.items && meta.items.length > 0) {
      const itemsArray = this.form.get("items") as FormArray;
      itemsArray.clear();
      meta.items.forEach((item: any) => {
        itemsArray.push(
          this.fb.group({
            name: [item.name || item.description || "", Validators.required],
            qty: [
              item.qty || item.quantity || 1,
              [Validators.required, Validators.min(1)],
            ],
            unitPrice: [
              item.unitPrice || 0,
              [Validators.required, Validators.min(0)],
            ],
            unitWeight: [
              item.unitWeight || 0,
              [Validators.required, Validators.min(0)],
            ],
          })
        );
      });
    }

    // Set delivery fee and metadata
    if (meta.fees) {
      this.form.patchValue({
        deliveryFee: meta.fees.feeTotal || 0,
        includeFeeInTotal:
          meta.grandTotal === this.subtotal + (meta.fees.feeTotal || 0),
      });
    }

    // Recompute derived values
    this.computeDerived();
  }

  // Extract user notes (removing META part)
  private extractUserNotes(notes: string): string {
    const metaIndex = notes.indexOf("META:");
    if (metaIndex > 0) {
      return notes.substring(0, metaIndex).trim();
    }
    return metaIndex === 0 ? "" : notes;
  }

  async submit(print = false) {
    // Check specific validation issues
    if (this.saving) return;

    // Force validation of all form fields
    this.markFormGroupTouched();

    if (this.form.invalid) {
      // Debug: identify exact invalid fields
      const invalidFields = this.debugFormValidation();

      // Provide specific error messages
      const errors: string[] = [];

      // Check items first (most common issue)
      if (this.items.invalid || this.items.length === 0) {
        if (this.items.length === 0) {
          errors.push("Au moins un produit est requis");
        } else {
          const itemErrors = this.getItemsErrorMessages();
          if (itemErrors.length > 0) {
            errors.push(...itemErrors);
          }
        }
      }

      // Check required client info
      if (this.form.get("clientName")?.invalid) {
        errors.push("Le nom du client est requis");
      }
      if (this.form.get("clientPhone")?.invalid) {
        errors.push("Le téléphone du client est requis");
      }

      // Check pickup address
      if (this.form.get("pickupAddress")?.invalid) {
        errors.push("L'adresse de récupération est requise");
      }
      if (this.form.get("pickupGovernorate")?.invalid) {
        errors.push("Le gouvernorat de récupération est requis");
      }

      // Check recipient info
      if (this.form.get("recipientName")?.invalid) {
        errors.push("Le nom du destinataire est requis");
      }
      if (this.form.get("recipientPhone")?.invalid) {
        errors.push("Le téléphone du destinataire est requis");
      }
      if (this.form.get("recipientAddressLine1")?.invalid) {
        errors.push("L'adresse du destinataire est requise");
      }
      if (this.form.get("recipientGovernorate")?.invalid) {
        errors.push("Le gouvernorat du destinataire est requis");
      }

      // Check weight
      if (this.form.get("weight")?.invalid) {
        errors.push("Le poids total est invalide");
      }

      // Check delivery fee
      if (this.form.get("deliveryFee")?.invalid) {
        errors.push("Les frais de livraison sont requis");
      }

      // Show specific errors
      if (errors.length > 0) {
        this.toastr.error(errors.join(" • "), "Formulaire invalide");
      } else {
        // Show debug info if no specific errors found
        this.toastr.error(
          `Champs invalides: ${invalidFields.join(", ")}`,
          "Erreurs de validation détectées"
        );
      }
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    try {
      if (this.isEditMode && this.shipmentId) {
        await this.updateShipment(print);
      } else {
        await this.createShipment(print);
      }
    } catch (e) {
      console.error("submit failed", e);
      this.toastr.error("Erreur lors de l'enregistrement");
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  // Create new shipment
  private async createShipment(print = false) {
    const { payload, v } = this.buildPayload();
    const ref = await this.shipmentService.create(payload);
    const newId = ref.id;

    // Assigner directement au livreur si spécifié
    if (v.driverId) {
      await this.shipmentService.assignToDriver(newId, v.driverId);
    }

    this.toastr.success("Colis créé");
    await this.maybePrint(print, newId, payload, v.driverId);
    await this.router.navigate(["/megafast/colis"]);
  }

  // Update existing shipment
  private async updateShipment(print = false) {
    if (!this.shipmentId) return;

    const { payload, v } = this.buildPayload();

    // Update the shipment
    await this.shipmentService.update(this.shipmentId, payload);

    // Handle direct driver assignment changes
    const currentDriver = this.originalShipment?.assignedTo;
    const newDriver = v.driverId;

    if (currentDriver !== newDriver) {
      if (newDriver) {
        await this.shipmentService.assignToDriver(this.shipmentId, newDriver);
      }
    }

    this.toastr.success("Colis modifié");

    if (print) {
      try {
        const driverMin: DriverMin | undefined = newDriver
          ? {
              id: newDriver,
              name: this.drivers.find((d) => d.id === newDriver)?.name || "",
            }
          : undefined;
        const updatedPayload = { ...payload, id: this.shipmentId };
        await this.printService.generateShipmentPdf(
          updatedPayload as Shipment,
          undefined,
          driverMin
        );
      } catch (error) {
        console.error("Erreur lors de l'impression:", error);
      }
    }

    await this.router.navigate(["/megafast/colis"]);
  }

  // Legacy method for backward compatibility (kept for now)
  async submitLegacy(print = false) {
    if (this.form.invalid || this.saving) {
      this.toastr.error("Formulaire invalide");
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();
    try {
      const { payload, v } = this.buildPayload();
      const ref = await this.shipmentService.create(payload);
      const newId = ref.id;

      // Assigner directement au livreur si spécifié
      if (v.driverId) {
        await this.shipmentService.assignToDriver(newId, v.driverId);
      }

      this.toastr.success("Colis créé");
      await this.maybePrint(print, newId, payload, v.driverId);
      await this.router.navigate(["/megafast/colis"]);
    } catch (e) {
      console.error("create shipment failed", e);
      this.toastr.error("Erreur lors de la création");
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
