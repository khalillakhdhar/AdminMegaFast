import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';

import { PageTitleComponent } from '../../../../shared/ui/pagetitle/pagetitle.component';
import { TUNISIA_CITIES } from '../../../../shared/data/tunisia-cities';
import { ShipmentService } from '../../../../core/services/shipment.service';
import { BatchService } from '../../../../core/services/batch.service';
import { DriverService } from '../../../../core/services/driver.service';
import { ClientService } from '../../../../core/services/client.service';
import { TunisiaLocationsService, TunisianGovernorate, TunisianDelegation } from '../../../../core/services/tunisia-locations.service';
import { Shipment } from '../../../../core/models/shipment.model';
import { Batch } from '../../../../core/models/batch.model';
import { Driver } from '../../../../core/models/driver.model';
import { Client } from '../../../../core/models/client.model';
import { Recipient, RecipientFormData } from '../../../../core/models/recipient.model';
import { ShipmentPrintService, DriverMin } from '../../../../core/services/shipment-print.service';
import { Subscription, take } from 'rxjs';

@Component({
  selector: 'app-colis-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgSelectModule, PageTitleComponent],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css'],
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
  batches: Batch[] = [];
  clients: Client[] = [];
  selectedClient: Client | null = null;

  // Client mode: 'existing' | 'new'
  clientMode: 'existing' | 'new' = 'existing';

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
    { label: 'Colis', link: '/megafast/colis' },
    { label: 'Créer', active: true },
  ];

  private sub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef,
    private readonly shipmentService: ShipmentService,
    private readonly batchService: BatchService,
    private readonly driverService: DriverService,
    private readonly clientService: ClientService,
    private readonly tunisiaService: TunisiaLocationsService,
    private readonly printService: ShipmentPrintService,
  ) {
    this.form = this.fb.group({
      // Step 1: Client (Sender) - Mode selection
      clientMode: ['existing'], // 'existing' | 'new'
      clientId: [''],
      clientName: ['', [Validators.required, Validators.minLength(2)]],
      clientPhone: ['', [Validators.required, Validators.minLength(6)]],
      clientEmail: [''],
      clientCompany: [''],

      // Step 1bis: Adresse de récupération (pickup)
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

      // Frais de livraison saisis (un seul montant)
      deliveryFee: [0, [Validators.min(0)]],
      includeFeeInTotal: [true], // Option pour inclure/exclure les frais du total

      // Step 5: Lot & Livreur
      batchMode: ['none'], // 'none' | 'existing' | 'create'
      batchId: [''],
      batchCode: [''],
      driverId: [''],
    });
  }

  ngOnInit(): void {
    // Load data
    this.sub = new Subscription();
    this.sub.add(this.driverService.getAll().subscribe(ds => {
      this.drivers = ds || [];
      this.cdr.markForCheck();
    }));

    this.sub.add(this.batchService.getAll().subscribe(bs => {
      this.batches = bs || [];
      this.cdr.markForCheck();
    }));

    this.sub.add(this.clientService.list({ limit: 200 }).subscribe(cs => {
      this.clients = cs || [];
      console.log('Clients loaded:', cs?.length || 0, this.clients); // Debug log
      this.cdr.markForCheck();
    }));

    // Load Tunisia locations
    this.governorates = this.tunisiaService.getGovernorates();
    this.pickupGovernorates = this.tunisiaService.getGovernorates();
    this.deliveryGovernorates = this.tunisiaService.getGovernorates();

    // Watch clientMode changes in form
    const clientModeControl = this.form.get('clientMode');
    if (clientModeControl) {
      this.sub.add(clientModeControl.valueChanges.subscribe(mode => {
        this.clientMode = mode;
        this.cdr.markForCheck();
      }));
    }

    // Recompute totals & fees on key changes
    const recompute = () => { this.computeDerived(); };
    this.sub.add(this.items.valueChanges.subscribe(recompute));
    const weight = this.form.get('weight');
    if (weight) this.sub.add(weight.valueChanges.subscribe(recompute));
    const deliveryFee = this.form.get('deliveryFee');
    if (deliveryFee) this.sub.add(deliveryFee.valueChanges.subscribe(recompute));

    const includeFeeInTotal = this.form.get('includeFeeInTotal');
    if (includeFeeInTotal) this.sub.add(includeFeeInTotal.valueChanges.subscribe(recompute));

    // Watch governorate changes
    const governorateControl = this.form.get('governorate');
    if (governorateControl) {
      this.sub.add(governorateControl.valueChanges.subscribe(code => {
        this.onGovernorateChange(code);
      }));
    }

    const pickupGovernorateControl = this.form.get('pickupGovernorate');
    if (pickupGovernorateControl) {
      this.sub.add(pickupGovernorateControl.valueChanges.subscribe(code => {
        this.onPickupGovernorateChange(code);
      }));
    }

    const recipientGovernorateControl = this.form.get('recipientGovernorate');
    if (recipientGovernorateControl) {
      this.sub.add(recipientGovernorateControl.valueChanges.subscribe(code => {
        this.onRecipientGovernorateChange(code);
      }));
    }

    // Initial compute
    this.computeDerived();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // -- Form helpers
  get items(): FormArray<FormGroup> {
    return this.form.get('items') as any;
  }

  newItem(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      qty: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      unitWeight: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addItem() { this.items.push(this.newItem()); this.computeDerived(); }
  removeItem(i: number) { if (this.items.length > 1) { this.items.removeAt(i); this.computeDerived(); } }

  // -- Client selection
  onClientModeChange(mode: 'existing' | 'new') {
    console.log('Client mode changed to:', mode);
    this.clientMode = mode;
    if (mode === 'new') {
      this.selectedClient = null;
      this.form.patchValue({
        clientId: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        clientCompany: ''
      });
    } else if (mode === 'existing') {
      // Clear manual client data when switching to existing mode
      this.form.patchValue({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        clientCompany: ''
      });
    }
    this.cdr.markForCheck();
  }

  onClientSelect(clientId: string) {
    const client = this.clients.find(c => c.id === clientId);
    this.selectedClient = client || null;

    if (client) {
      this.form.patchValue({
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        clientCompany: client.company
      });

      // Auto-import client address if available
      if (client.address) {
        if (client.address.line1) {
          this.form.patchValue({
            pickupAddress: client.address.line1 + (client.address.line2 ? ', ' + client.address.line2 : '')
          });
        }

        // Try to find matching governorate
        if (client.address.city) {
          const matchingGov = this.pickupGovernorates.find(g =>
            g.name.toLowerCase() === client.address!.city!.toLowerCase() ||
            g.arabicName === client.address!.city
          );
          if (matchingGov) {
            this.form.patchValue({ pickupGovernorate: matchingGov.code });
            this.onPickupGovernorateChange(matchingGov.code);

            // Try to find matching delegation
            if (client.address.delegation) {
              const matchingDel = this.pickupDelegations.find(d =>
                d.name.toLowerCase() === client.address!.delegation!.toLowerCase() ||
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
      console.log('Client sélectionné:', client.name, 'avec adresse:', client.address);

      this.cdr.markForCheck();
    }
  }

  clearClientSelection() {
    this.selectedClient = null;
    this.form.patchValue({
      clientId: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientCompany: ''
    });
    this.cdr.markForCheck();
  }

  // -- Location handlers
  onGovernorateChange(governorateCode: string) {
    this.selectedGovernorate = this.governorates.find(g => g.code === governorateCode) || null;
    this.delegations = this.selectedGovernorate ? this.selectedGovernorate.delegations : [];
    this.form.patchValue({ delegation: '' });
    this.cdr.markForCheck();
  }

  onDeliveryGovernorateChange(event: any) {
    const governorateCode = event.target ? event.target.value : event;
    this.selectedGovernorate = this.governorates.find(g => g.code === governorateCode);
    this.delegations = this.tunisiaService.getDelegations(governorateCode);

    // Reset delegation when governorate changes
    this.form.patchValue({ delegation: '' });
  }

  onPickupGovernorateChange(event: any) {
    const governorateCode = event.target ? event.target.value : event;
    this.selectedPickupGovernorate = this.pickupGovernorates.find(g => g.code === governorateCode);
    this.pickupDelegations = this.tunisiaService.getDelegations(governorateCode);

    // Reset delegation when governorate changes
    this.form.patchValue({ pickupDelegation: '' });
  }

  onRecipientGovernorateChange(event: any) {
    const governorateCode = event.target ? event.target.value : event;
    this.selectedDeliveryGovernorate = this.deliveryGovernorates.find(g => g.code === governorateCode);
    this.deliveryDelegations = this.tunisiaService.getDelegations(governorateCode);

    // Reset delegation when governorate changes
    this.form.patchValue({ recipientDelegation: '' });
  }

  // -- Calculs
  private computeDerived() {
    this.subtotal = this.calcSubtotal();
    const autoWeight = this.calcWeightFromItems();
    // If user hasn't overridden weight (0), use auto
    const weightCtrl = this.form.get('weight');
    if (weightCtrl && !weightCtrl.value) {
      weightCtrl.setValue(autoWeight, { emitEvent: false });
    }
    this.totalQty = this.calcTotalQty();

    const fee = Number(this.form.get('deliveryFee')?.value || 0);
    const includeFeeInTotal = this.form.get('includeFeeInTotal')?.value;

    // Calcul du total sans frais
    this.grandTotalWithoutFee = this.subtotal;

    // Calcul du total avec ou sans frais selon l'option
    this.grandTotal = includeFeeInTotal ? this.subtotal + fee : this.subtotal;

    this.cdr.markForCheck();
  }

  private calcSubtotal(): number {
    return this.items.controls.reduce((sum, g: any) => sum + (Number(g.value.qty) * Number(g.value.unitPrice)), 0);
  }
  private calcTotalQty(): number {
    return this.items.controls.reduce((sum, g: any) => sum + Number(g.value.qty), 0);
  }

  // Getter pour les frais de livraison
  get deliveryFee(): number {
    return Number(this.form.get('deliveryFee')?.value || 0);
  }

  // Getter pour savoir si les frais sont inclus dans le total
  get includeFeeInTotal(): boolean {
    return this.form.get('includeFeeInTotal')?.value === true;
  }

  // Getter pour le total avec frais (toujours)
  get totalWithFees(): number {
    return this.subtotal + this.deliveryFee;
  }
  private calcWeightFromItems(): number {
    return this.items.controls.reduce((sum, g: any) => sum + (Number(g.value.qty) * Number(g.value.unitWeight)), 0);
  }

  // removed fee breakdown: single deliveryFee is entered by user

  // -- Wizard navigation
  next() { if (this.step < 5) this.step++; }
  prev() { if (this.step > 1) this.step--; }
  goToStep(stepNumber: number) {
    this.step = stepNumber;
  }

  // Helper methods for template
  getDelegationName(delegationCode: string): string {
    const delegation = this.delegations.find(d => d.code === delegationCode);
    return delegation ? delegation.name : '';
  }

  getPickupDelegationName(delegationCode: string): string {
    const delegation = this.pickupDelegations.find(d => d.code === delegationCode);
    return delegation ? delegation.name : '';
  }

  getDeliveryDelegationName(delegationCode: string): string {
    const delegation = this.deliveryDelegations.find(d => d.code === delegationCode);
    return delegation ? delegation.name : '';
  }

  // -- Submit
  private buildPayload() {
    const v = this.form.getRawValue();
    const barcode = 'MGF-' + Date.now();
    const items = v.items || [];
  const fees = { feeTotal: Number(v.deliveryFee || 0) };
    const meta = { items, fees, subtotal: this.subtotal, totalQty: this.totalQty, grandTotal: this.grandTotal };
    const userNotes = (v.notes || '').trim();
    const notes = userNotes ? `${userNotes}\nMETA:${JSON.stringify(meta)}` : `META:${JSON.stringify(meta)}`;
    const payload: any = {
      barcode,
      status: 'created',
      paymentMode: v.paymentMode,
      amount: Number(v.amount) || 0,
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
      const gov = this.governorates.find(g => g.code === v.governorate);
      payload.city = gov ? gov.name : v.governorate;
    }
    if (v.delegation) {
      const del = this.delegations.find(d => d.code === v.delegation);
      payload.delegation = del ? del.name : v.delegation;
    }

    // Pickup address fields
    if (v.pickupAddress) payload.pickupAddress = v.pickupAddress;
    if (v.pickupGovernorate) {
      const pickupGov = this.pickupGovernorates.find(g => g.code === v.pickupGovernorate);
      payload.pickupCity = pickupGov ? pickupGov.name : v.pickupGovernorate;
    }
    if (v.pickupDelegation) {
      const pickupDel = this.pickupDelegations.find(d => d.code === v.pickupDelegation);
      payload.pickupDelegation = pickupDel ? pickupDel.name : v.pickupDelegation;
    }
    return { payload, v };
  }

  private async handleBatchAndDriver(newId: string, v: any) {
    if (v.batchMode === 'existing' && v.batchId) {
      await this.shipmentService.assignToBatch(newId, v.batchId);
      if (v.driverId) {
        const batchSnapSub = this.batchService.getById(v.batchId).pipe(take(1)).subscribe(async (b) => {
          try {
            if (b && !b.assignedTo) {
              await this.batchService.update(v.batchId, { assignedTo: v.driverId });
            }
            await this.batchService.recomputeStats(v.batchId);
          } catch {}
        });
        this.sub?.add(batchSnapSub);
      } else {
        await this.batchService.recomputeStats(v.batchId);
      }
    } else if (v.batchMode === 'create') {
      const batchData: Partial<Batch> = {
        code: v.batchCode || undefined,
        assignedTo: v.driverId || '',
        shipmentIds: [newId],
        status: 'planned',
        createdAt: new Date(),
      } as any;
      const bref = await this.batchService.create(batchData as Batch);
      const batchId = bref.id;
      await this.shipmentService.assignToBatch(newId, batchId);
      await this.batchService.recomputeStats(batchId);
    }
  }

  private async maybePrint(print: boolean, newId: string, payload: Shipment, driverId?: string) {
    if (!print) return;
    const createdShipment: Shipment = { id: newId, ...payload };
    let driverMin: DriverMin | undefined;
    if (driverId) {
      const d = this.drivers.find(x => x.id === driverId);
      if (d) driverMin = { id: d.id, name: d.displayName || d.name, phone: d.phone, vehicle: d.vehicle };
    }
    try { await this.printService.generateShipmentPdf(createdShipment, undefined, driverMin); } catch {}
  }

  async submit(print = false) {
    if (this.form.invalid || this.saving) { this.toastr.error('Formulaire invalide'); return; }
    this.saving = true; this.cdr.markForCheck();
    try {
      const { payload, v } = this.buildPayload();
      const ref = await this.shipmentService.create(payload);
      const newId = ref.id;
      await this.handleBatchAndDriver(newId, v);
      this.toastr.success('Colis créé');
      await this.maybePrint(print, newId, payload, v.driverId);
      await this.router.navigate(['/megafast/colis']);
    } catch (e) {
      console.error('create shipment failed', e);
      this.toastr.error('Erreur lors de la création');
    } finally {
      this.saving = false; this.cdr.markForCheck();
    }
  }
}
