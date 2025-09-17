import { Component, OnInit, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subscription } from 'rxjs';

import { ClientShipmentService } from '../../../../core/services/client-shipment.service';
import { TunisiaLocationsService, TunisianGovernorate, TunisianDelegation } from '../../../../core/services/tunisia-locations.service';
import { DriverService } from '../../../../core/services/driver.service';
import { Shipment } from '../../../../core/models/shipment.model';
import { Driver } from '../../../../core/models/driver.model';

@Component({
  selector: 'app-shipments-create',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class ShipmentsCreateComponent implements OnInit, OnDestroy {

  shipmentForm!: FormGroup;
  isSubmitting = false;

  // Wizard steps
  step = 1;

  // Tunisia locations
  governorates: TunisianGovernorate[] = [];
  selectedGovernorate: TunisianGovernorate | null = null;
  delegations: TunisianDelegation[] = [];

  // Pickup locations
  pickupGovernorates: TunisianGovernorate[] = [];
  selectedPickupGovernorate: TunisianGovernorate | null = null;
  pickupDelegations: TunisianDelegation[] = [];

  // Delivery locations (recipient)
  deliveryGovernorates: TunisianGovernorate[] = [];
  selectedDeliveryGovernorate: TunisianGovernorate | null = null;
  deliveryDelegations: TunisianDelegation[] = [];

  // Drivers selection
  availableDrivers: Driver[] = [];
  selectedDriver: Driver | null = null;

  // Derived values
  subtotal = 0;
  totalQty = 0;
  grandTotal = 0;

  private sub?: Subscription;

  // Services injectés
  private fb = inject(FormBuilder);
  private clientShipmentService = inject(ClientShipmentService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private tunisiaService = inject(TunisiaLocationsService);
  private driverService = inject(DriverService);

  ngOnInit(): void {
    this.initForm();
    this.loadTunisiaLocations();
    this.loadDrivers();
    this.setupFormWatchers();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private initForm(): void {
    this.shipmentForm = this.fb.group({
      // Step 1: Adresse de récupération (pickup)
      pickupAddress: ['', [Validators.required, Validators.minLength(3)]],
      pickupGovernorate: ['', [Validators.required]],
      pickupDelegation: [''],

      // Step 2: Destinataire (Recipient)
      recipientName: ['', [Validators.required, Validators.minLength(2)]],
      recipientPhone: ['', [Validators.required, Validators.minLength(6)]],
      recipientEmail: [''],
      recipientCompany: [''],
      recipientAddressLine1: ['', [Validators.required, Validators.minLength(3)]],
      recipientAddressLine2: [''],
      recipientGovernorate: ['', [Validators.required]],
      recipientDelegation: [''],
      recipientPostalCode: [''],
      recipientNotes: [''],

      // Step 3: Produits
      items: this.fb.array([this.newItem()]),

      // Step 4: Livraison & Frais
      notes: [''],
      paymentMode: ['cod', Validators.required],
      amount: [0, [Validators.min(0)]],
      weight: [0, [Validators.min(0)]],
      deliveryFee: [0, [Validators.min(0)]],
      includeFeeInTotal: [true],

      // Optional driver selection
      selectedDriverId: ['']
    });
  }

  private loadTunisiaLocations(): void {
    // Charger les gouvernorats directement (pas d'Observable)
    this.pickupGovernorates = this.tunisiaService.getGovernorates();
    this.governorates = this.tunisiaService.getGovernorates();
    this.deliveryGovernorates = this.tunisiaService.getGovernorates();
    this.cdr.markForCheck();
  }

  private loadDrivers(): void {
    // Charger tous les livreurs actifs
    this.driverService.getAll().subscribe({
      next: (drivers) => {
        // Filtrer seulement les livreurs actifs
        this.availableDrivers = drivers.filter(driver => driver.active);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des livreurs:', error);
        this.availableDrivers = [];
      }
    });
  }

  private setupFormWatchers(): void {
    const recompute = () => { this.computeDerived(); };

    // Watch form changes for automatic calculations
    this.shipmentForm.get('items')?.valueChanges.subscribe(recompute);
    this.shipmentForm.get('deliveryFee')?.valueChanges.subscribe(recompute);
    this.shipmentForm.get('includeFeeInTotal')?.valueChanges.subscribe(recompute);

    // Watch payment mode changes
    this.shipmentForm.get('paymentMode')?.valueChanges.subscribe(mode => {
      const amountControl = this.shipmentForm.get('amount');
      if (mode === 'cod') {
        amountControl?.setValidators([Validators.required, Validators.min(0.01)]);
      } else {
        amountControl?.clearValidators();
        amountControl?.setValue(null);
      }
      amountControl?.updateValueAndValidity();
    });

    // Initial calculation
    this.computeDerived();
  }

  // Items management (définition principale)
  get items(): FormArray {
    return this.shipmentForm.get('items') as FormArray;
  }

  newItem(): FormGroup {
    return this.fb.group({
      description: ['', [Validators.required, Validators.minLength(2)]],
      qty: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]]
    });
  }

  addItem(): void {
    this.items.push(this.newItem());
    this.computeDerived();
  }

  removeItem(i: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(i);
      this.computeDerived();
    }
  }

  // Location methods
  onPickupGovernorateChange(govCode: string): void {
    const gov = this.pickupGovernorates.find(g => g.code === govCode);
    this.selectedPickupGovernorate = gov || null;
    if (gov) {
      this.pickupDelegations = this.tunisiaService.getDelegations(gov.code);
      this.cdr.markForCheck();
    } else {
      this.pickupDelegations = [];
    }
  }

  onDeliveryGovernorateChange(govCode: string): void {
    const gov = this.deliveryGovernorates.find(g => g.code === govCode);
    this.selectedDeliveryGovernorate = gov || null;
    if (gov) {
      this.deliveryDelegations = this.tunisiaService.getDelegations(gov.code);
      this.cdr.markForCheck();
    } else {
      this.deliveryDelegations = [];
    }
  }

  onDriverSelectionChange(driverId: string): void {
    this.selectedDriver = this.availableDrivers.find(d => d.id === driverId) || null;
  }

  // Getters for template
  get deliveryFee(): number {
    return Number(this.shipmentForm.get('deliveryFee')?.value || 0);
  }

  get includeFeeInTotal(): boolean {
    return this.shipmentForm.get('includeFeeInTotal')?.value === true;
  }

  get totalWithFees(): number {
    return this.subtotal + this.deliveryFee;
  }

  // Navigation
  nextStep(): void {
    if (this.step < 4) {
      this.step++;
    }
  }

  prevStep(): void {
    if (this.step > 1) {
      this.step--;
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.shipmentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  async onSubmit(): Promise<void> {
    if (this.shipmentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.shipmentForm.value;
      const items = formValue.items || [];
      const fees = { feeTotal: Number(formValue.deliveryFee || 0) };
      const meta = {
        items,
        fees,
        subtotal: this.subtotal,
        totalQty: this.totalQty,
        grandTotal: this.grandTotal,
        recipient: {
          name: formValue.recipientName,
          phone: formValue.recipientPhone,
          email: formValue.recipientEmail,
          company: formValue.recipientCompany,
          addressLine1: formValue.recipientAddressLine1,
          addressLine2: formValue.recipientAddressLine2,
          governorate: formValue.recipientGovernorate,
          delegation: formValue.recipientDelegation
        }
      };

      const userNotes = (formValue.notes || '').trim();
      const notes = userNotes ? `${userNotes}\nMETA:${JSON.stringify(meta)}` : `META:${JSON.stringify(meta)}`;

      const shipmentData: Partial<Shipment> = {
        // Client info (will be auto-filled from session)
        clientName: formValue.recipientName,
        clientPhone: formValue.recipientPhone,
        clientEmail: formValue.recipientEmail,

        // Addresses
        address: formValue.recipientAddressLine1,
        city: this.getGovernorateNameByCode(formValue.recipientGovernorate) || formValue.recipientGovernorate,
        delegation: this.getDelegationNameByCode(formValue.recipientDelegation) || formValue.recipientDelegation,

        pickupAddress: formValue.pickupAddress,
        pickupCity: this.getGovernorateNameByCode(formValue.pickupGovernorate) || formValue.pickupGovernorate,
        pickupDelegation: this.getDelegationNameByCode(formValue.pickupDelegation) || formValue.pickupDelegation,

        // Package details
        weight: formValue.weight,
        volume: formValue.volume || 0,
        notes: notes,

        // Payment
        paymentMode: formValue.paymentMode,
        amount: formValue.paymentMode === 'cod' ? formValue.amount : 0,

        // Driver assignment (if selected)
        assignedTo: formValue.selectedDriverId || undefined,

        // Status
        status: 'created'
      };

      await this.clientShipmentService.createShipment(shipmentData);

      console.log('Colis créé avec succès!');
      this.router.navigate(['/client/shipments']);

    } catch (error) {
      console.error('Erreur lors de la création du colis:', error);
      console.error('Erreur lors de la création du colis');
    } finally {
      this.isSubmitting = false;
    }
  }

  private getGovernorateNameByCode(code: string): string {
    const governorate = this.governorates.find(g => g.code === code);
    return governorate ? governorate.name : '';
  }

  private getDelegationNameByCode(code: string): string {
    const delegation = this.deliveryDelegations.find(d => d.code === code) ||
                     this.pickupDelegations.find(d => d.code === code);
    return delegation ? delegation.name : '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.shipmentForm.controls).forEach(key => {
      const control = this.shipmentForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(group => {
          if (group instanceof FormGroup) {
            Object.keys(group.controls).forEach(subKey => {
              group.get(subKey)?.markAsTouched();
            });
          }
        });
      }
    });
  }

  // Méthodes manquantes pour le template
  onDeliveryFeeChange(): void {
    this.computeDerived();
  }

  computeDerived(): void {
    const items = this.items.value;
    this.subtotal = items.reduce((sum: number, item: any) =>
      sum + (item.qty * item.unitPrice), 0);
    this.totalQty = items.reduce((sum: number, item: any) =>
      sum + item.qty, 0);

    const deliveryFee = Number(this.shipmentForm.get('deliveryFee')?.value || 0);
    this.grandTotal = this.subtotal + deliveryFee;
  }
}
