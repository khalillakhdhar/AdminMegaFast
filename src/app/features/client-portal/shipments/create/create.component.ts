import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { ClientShipmentService } from '../../../../core/services/client-shipment.service';
import { Shipment } from '../../../../core/models/shipment.model';

@Component({
  selector: 'app-shipments-create',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class ShipmentsCreateComponent implements OnInit {

  shipmentForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private clientShipmentService: ClientShipmentService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.shipmentForm = this.fb.group({
      // Delivery information
      clientName: ['', [Validators.required]],
      clientPhone: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      delegation: [''],

      // Package information
      weight: [null],
      volume: [null],
      notes: [''],

      // Payment
      paymentMode: ['', [Validators.required]],
      amount: [null],

      // Pickup address (optional)
      pickupAddress: [''],
      pickupCity: [''],
      pickupDelegation: ['']
    });

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

      const shipmentData: Partial<Shipment> = {
        clientName: formValue.clientName,
        clientPhone: formValue.clientPhone,
        address: formValue.address,
        city: formValue.city,
        delegation: formValue.delegation,
        weight: formValue.weight,
        volume: formValue.volume,
        notes: formValue.notes,
        paymentMode: formValue.paymentMode,
        amount: formValue.paymentMode === 'cod' ? formValue.amount : null,
        pickupAddress: formValue.pickupAddress || null,
        pickupCity: formValue.pickupCity || null,
        pickupDelegation: formValue.pickupDelegation || null
      };

      await this.clientShipmentService.createShipment(shipmentData);

      this.toastr.success('Colis créé avec succès!');
      this.router.navigate(['/client/shipments']);

    } catch (error) {
      console.error('Erreur lors de la création du colis:', error);
      this.toastr.error('Erreur lors de la création du colis');
    } finally {
      this.isSubmitting = false;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.shipmentForm.controls).forEach(field => {
      const control = this.shipmentForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}
