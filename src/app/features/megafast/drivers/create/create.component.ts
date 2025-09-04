import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PageTitleComponent } from '../../../../shared/ui/pagetitle/pagetitle.component';
import { DriverService } from '../../../../core/services/driver.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { TUNISIA_CITIES } from '../../../../shared/data/tunisia-cities';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PageTitleComponent, NgSelectModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateComponent {
  form: FormGroup;
  saving = false;
  cities = TUNISIA_CITIES;

  breadCrumbItems = [
    { label: 'Livreurs', link: '/megafast/drivers' },
    { label: 'Nouveau', active: true }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly driverService: DriverService,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {
    this.form = this.fb.group({
      uid: [''], // optionnel si lié à auth plus tard
      name: ['', [Validators.required, Validators.minLength(2)]],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.email]],
      vehicle: [''],
      cin: [''],
      zones: [[] as string[]], // multi-sélection de villes
      active: [true],
      createAccount: [false] // New field for account creation option
    });
  }

  get f() { return this.form.controls; }

  async submit() {
    if (this.form.invalid || this.saving) return;

    const formValue = this.form.value;
    const createAccount = formValue.createAccount;

    // Validate email if creating account
    if (createAccount && !formValue.email) {
      this.toastr.error('L\'email est requis pour créer un compte utilisateur');
      return;
    }

    this.saving = true;
    const zones = (formValue.zones || []) as string[];

    // Remove createAccount from driver data
    const { createAccount: _, ...driverData } = formValue;

    const driver = {
      uid: driverData.uid || '',
      name: driverData.name,
      displayName: driverData.displayName,
      phone: driverData.phone,
      email: driverData.email || '',
      vehicle: driverData.vehicle || '',
      cin: driverData.cin || '',
      zones,
      active: !!driverData.active
    };

    try {
      if (createAccount) {
        await this.driverService.createWithAccount(driver, true);
      } else {
        await this.driverService.create(driver);
        this.toastr.success('Livreur créé avec succès');
      }
      this.router.navigate(['/megafast/drivers']);
    } catch (e) {
      console.error('create driver failed', e);
      this.toastr.error("Erreur lors de la création du livreur: " + (e.message || e));
    } finally {
      this.saving = false;
    }
  }
}
