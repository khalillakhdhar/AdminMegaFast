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
import { Shipment } from '../../../../core/models/shipment.model';
import { Batch } from '../../../../core/models/batch.model';
import { Driver } from '../../../../core/models/driver.model';
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

  // Data
  drivers: Driver[] = [];
  batches: Batch[] = [];

  // Form
  form: FormGroup;

  // Derived
  subtotal = 0;
  totalQty = 0;
  grandTotal = 0;

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
    private readonly printService: ShipmentPrintService,
  ) {
    this.form = this.fb.group({
      // Step 1: Client
  clientName: ['', [Validators.required, Validators.minLength(2)]],
  clientPhone: ['', [Validators.required, Validators.minLength(6)]],

  // Step 1bis: Adresse de récupération (pickup)
  pickupAddress: ['', [Validators.required, Validators.minLength(3)]],
  pickupCity: ['Tunis', [Validators.required]],
  pickupDelegation: [''],

      // Step 2: Produits
      items: this.fb.array([this.newItem()]),

  // Step 3: Livraison & Frais
      address: [''],
      city: ['Tunis', Validators.required],
      delegation: [''],
      notes: [''],
      paymentMode: ['cod', Validators.required],
      amount: [0, [Validators.min(0)]],
      weight: [0, [Validators.min(0)]],

  // Frais de livraison saisis (un seul montant)
  deliveryFee: [0, [Validators.min(0)]],

      // Step 4: Lot & Livreur
      batchMode: ['none'], // 'none' | 'existing' | 'create'
      batchId: [''],
      batchCode: [''],
      driverId: [''],
    });
  }

  ngOnInit(): void {
    // Load drivers & batches
    this.sub = new Subscription();
    this.sub.add(this.driverService.getAll().subscribe(ds => { this.drivers = ds || []; this.cdr.markForCheck(); }));
    this.sub.add(this.batchService.getAll().subscribe(bs => { this.batches = bs || []; this.cdr.markForCheck(); }));

    // Recompute totals & fees on key changes
    const recompute = () => { this.computeDerived(); };
  this.sub.add(this.items.valueChanges.subscribe(recompute));
  const weight = this.form.get('weight'); if (weight) this.sub.add(weight.valueChanges.subscribe(recompute));
  const deliveryFee = this.form.get('deliveryFee'); if (deliveryFee) this.sub.add(deliveryFee.valueChanges.subscribe(recompute));

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
  this.grandTotal = this.subtotal + fee;
    this.cdr.markForCheck();
  }

  private calcSubtotal(): number {
    return this.items.controls.reduce((sum, g: any) => sum + (Number(g.value.qty) * Number(g.value.unitPrice)), 0);
  }
  private calcTotalQty(): number {
    return this.items.controls.reduce((sum, g: any) => sum + Number(g.value.qty), 0);
  }
  private calcWeightFromItems(): number {
    return this.items.controls.reduce((sum, g: any) => sum + (Number(g.value.qty) * Number(g.value.unitWeight)), 0);
  }

  // removed fee breakdown: single deliveryFee is entered by user

  // -- Wizard navigation
  next() { if (this.step < 5) this.step++; }
  prev() { if (this.step > 1) this.step--; }

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
    if (v.clientName) payload.clientName = v.clientName;
    if (v.clientPhone) payload.clientPhone = v.clientPhone;
    if (v.address) payload.address = v.address;
    if (v.city) payload.city = v.city;
    if (v.delegation) payload.delegation = v.delegation;
    // pickupAddress & pickupCity are required in the form, but guard anyway
    if (v.pickupAddress) payload.pickupAddress = v.pickupAddress;
    if (v.pickupCity) payload.pickupCity = v.pickupCity;
    if (v.pickupDelegation) payload.pickupDelegation = v.pickupDelegation;
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
