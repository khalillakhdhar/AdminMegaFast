import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';

import { AuthenticationService } from '../../../core/services/auth.service';
import { ClientService } from '../../../core/services/client.service';
import { Client } from '../../../core/models/client.model';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ClientProfileComponent implements OnInit {

  profileForm!: FormGroup;
  client$!: Observable<Client | undefined>;
  isSubmitting = false;
  private currentClientId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    private clientService: ClientService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadClientData();
  }

  private initForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: [''],
      phone: [''],
      company: [''],
      vatNumber: [''],
      addressLine1: [''],
      addressLine2: [''],
      city: [''],
      delegation: [''],
      postalCode: [''],
      country: [''],
      notes: ['']
    });
  }

  private loadClientData(): void {
    this.currentClientId = this.authService.getCurrentClientId();

    if (this.currentClientId) {
      this.client$ = this.clientService.getById(this.currentClientId);

      this.client$.subscribe(client => {
        if (client) {
          this.profileForm.patchValue({
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company,
            vatNumber: client.vatNumber,
            addressLine1: client.address?.line1,
            addressLine2: client.address?.line2,
            city: client.address?.city,
            delegation: client.address?.delegation,
            postalCode: client.address?.postalCode,
            country: client.address?.country,
            notes: client.notes
          });
        }
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid || !this.currentClientId) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.profileForm.value;

      const updateData: Partial<Client> = {
        name: formValue.name,
        phone: formValue.phone,
        company: formValue.company,
        vatNumber: formValue.vatNumber,
        notes: formValue.notes,
        address: {
          line1: formValue.addressLine1,
          line2: formValue.addressLine2,
          city: formValue.city,
          delegation: formValue.delegation,
          postalCode: formValue.postalCode,
          country: formValue.country
        }
      };

      await this.clientService.update(this.currentClientId, updateData);

      this.toastr.success('Profil mis à jour avec succès!');

    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      this.toastr.error('Erreur lors de la mise à jour du profil');
    } finally {
      this.isSubmitting = false;
    }
  }

  changePassword(): void {
    // You can implement a password reset flow here
    this.toastr.info('Fonctionnalité de changement de mot de passe en développement');
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(field => {
      const control = this.profileForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}
