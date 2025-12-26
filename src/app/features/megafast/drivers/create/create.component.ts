import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { PageTitleComponent } from "../../../../shared/ui/pagetitle/pagetitle.component";
import { DriverService } from "../../../../core/services/driver.service";
import { DriverZone } from "../../../../core/models/driver.model";
import { NgSelectModule } from "@ng-select/ng-select";
import { TUNISIA_CITIES } from "../../../../shared/data/tunisia-cities";

@Component({
  selector: "app-create",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    PageTitleComponent,
    NgSelectModule,
  ],
  templateUrl: "./create.component.html",
  styleUrls: ["./create.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateComponent {
  form: FormGroup;
  saving = false;
  cities = TUNISIA_CITIES;

  breadCrumbItems = [
    { label: "Livreurs", link: "/megafast/drivers" },
    { label: "Nouveau", active: true },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly driverService: DriverService,
    private readonly router: Router,
    private readonly toastr: ToastrService
  ) {
    this.form = this.fb.group({
      uid: [""], // optionnel si lié à auth plus tard
      name: ["", [Validators.required, Validators.minLength(2)]],
      displayName: ["", [Validators.required, Validators.minLength(2)]],
      phone: ["", [Validators.required]],
      email: ["", [Validators.email]],
      vehicle: [""],
      cin: [""],
      zones: [[] as string[]], // multi-sélection de villes
      active: [true],
      createAccount: [false], // Option for account creation
      adminPassword: [""], // Admin-defined password (optional)
      useAdminPassword: [false], // Toggle for using admin-defined password
    });
  }

  get f() {
    return this.form.controls;
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

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    // Fill to 8 characters
    for (let i = password.length; i < 8; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    const shuffled = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
    this.form.patchValue({ adminPassword: shuffled });
    this.toastr.info(`Mot de passe généré: ${shuffled}`, "Mot de passe", {
      timeOut: 5000,
    });
  }

  async submit() {
    if (this.form.invalid || this.saving) return;

    const formValue = this.form.value;
    const createAccount = formValue.createAccount;
    const useAdminPassword = formValue.useAdminPassword;
    const adminPassword = formValue.adminPassword;

    // Validate email if creating account
    if (createAccount && !formValue.email) {
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

    this.saving = true;
    const zoneStrings = (formValue.zones || []) as string[];
    const zones: DriverZone[] = zoneStrings.map((zoneName, index) => ({
      id: `zone_${index + 1}`,
      name: zoneName,
      type: "assigned" as const,
      coordinates: [],
      priority: index + 1,
      active: true,
    }));

    // Remove form-specific fields from driver data
    const {
      createAccount: _,
      adminPassword: __,
      useAdminPassword: ___,
      ...driverData
    } = formValue;

    const driver = {
      uid: driverData.uid || "",
      name: driverData.name,
      displayName: driverData.displayName,
      phone: driverData.phone,
      email: driverData.email || "",
      vehicle: driverData.vehicle || "",
      cin: driverData.cin || "",
      zones,
      active: !!driverData.active,
    };

    try {
      if (createAccount) {
        // Pass admin password if set, otherwise service will generate one
        const passwordToUse =
          useAdminPassword && adminPassword ? adminPassword : undefined;
        await this.driverService.createWithAccount(driver, true, passwordToUse);
      } else {
        await this.driverService.create(driver);
        this.toastr.success("Livreur créé avec succès");
      }
      this.router.navigate(["/megafast/drivers"]);
    } catch (e: any) {
      console.error("create driver failed", e);
      this.toastr.error(
        "Erreur lors de la création du livreur: " + (e.message || e)
      );
    } finally {
      this.saving = false;
    }
  }
}
