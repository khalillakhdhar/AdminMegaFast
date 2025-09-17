import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GeolocationService, GeolocationPosition } from '../../../core/services/geolocation.service';
import { DriverService } from '../../../core/services/driver.service';
import { AuthenticationService } from '../../../core/services/auth.service';
import { Driver } from '../../../core/models/driver.model';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="driver-profile">
      <div class="page-header">
        <h1>Mon Profil</h1>
        <p>Gérez vos informations personnelles et sécurité</p>
      </div>

      <div class="profile-container">
        <!-- Profile Information -->
        <div class="profile-card">
          <div class="card-header">
            <h2>
              <i class="fas fa-user"></i>
              Informations personnelles
            </h2>
          </div>
          <div class="card-body">
            <form [formGroup]="profileForm" (ngSubmit)="onUpdateProfile()">
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">Prénom</label>
                  <input
                    type="text"
                    id="firstName"
                    formControlName="firstName"
                    class="form-control"
                    placeholder="Votre prénom">
                  <div class="error-message" *ngIf="profileForm.get('firstName')?.errors?.['required'] && profileForm.get('firstName')?.touched">
                    Le prénom est requis
                  </div>
                </div>
                <div class="form-group">
                  <label for="lastName">Nom</label>
                  <input
                    type="text"
                    id="lastName"
                    formControlName="lastName"
                    class="form-control"
                    placeholder="Votre nom">
                  <div class="error-message" *ngIf="profileForm.get('lastName')?.errors?.['required'] && profileForm.get('lastName')?.touched">
                    Le nom est requis
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    formControlName="email"
                    class="form-control"
                    placeholder="votre@email.com">
                  <div class="error-message" *ngIf="profileForm.get('email')?.errors?.['required'] && profileForm.get('email')?.touched">
                    L'email est requis
                  </div>
                  <div class="error-message" *ngIf="profileForm.get('email')?.errors?.['email'] && profileForm.get('email')?.touched">
                    Format d'email invalide
                  </div>
                </div>
                <div class="form-group">
                  <label for="phone">Téléphone</label>
                  <input
                    type="tel"
                    id="phone"
                    formControlName="phone"
                    class="form-control"
                    placeholder="Votre numéro de téléphone">
                  <div class="error-message" *ngIf="profileForm.get('phone')?.errors?.['required'] && profileForm.get('phone')?.touched">
                    Le téléphone est requis
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="address">Adresse</label>
                <textarea
                  id="address"
                  formControlName="address"
                  class="form-control"
                  rows="3"
                  placeholder="Votre adresse complète"></textarea>
              </div>

              <!-- Vehicle Information -->
              <div class="vehicle-section">
                <h3>
                  <i class="fas fa-car"></i>
                  Informations du véhicule
                </h3>

                <div class="form-row">
                  <div class="form-group">
                    <label for="licenseNumber">Numéro de permis</label>
                    <input
                      type="text"
                      id="licenseNumber"
                      formControlName="licenseNumber"
                      class="form-control"
                      placeholder="Votre numéro de permis de conduire">
                  </div>
                  <div class="form-group">
                    <label for="vehicleType">Type de véhicule</label>
                    <select
                      id="vehicleType"
                      formControlName="vehicleType"
                      class="form-control">
                      <option value="">Sélectionner le type</option>
                      <option value="car">Voiture</option>
                      <option value="motorcycle">Moto</option>
                      <option value="van">Fourgonnette</option>
                      <option value="truck">Camion</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label for="vehiclePlate">Plaque d'immatriculation</label>
                  <input
                    type="text"
                    id="vehiclePlate"
                    formControlName="vehiclePlate"
                    class="form-control"
                    placeholder="Ex: 123 TUN 456">
                </div>
              </div>

              <!-- Geolocation Section -->
              <div class="geolocation-section">
                <h3>
                  <i class="fas fa-map-marker-alt"></i>
                  Géolocalisation
                </h3>

                <div class="location-info">
                  <div class="location-status" *ngIf="currentLocation.latitude && currentLocation.longitude">
                    <i class="fas fa-check-circle text-success"></i>
                    Position actuelle: {{ currentLocation.latitude | number:'1.6-6' }}, {{ currentLocation.longitude | number:'1.6-6' }}
                  </div>
                  <div class="location-status" *ngIf="!currentLocation.latitude || !currentLocation.longitude">
                    <i class="fas fa-exclamation-triangle text-warning"></i>
                    Aucune position détectée
                  </div>
                </div>

                <div class="location-actions">
                  <button
                    type="button"
                    class="btn btn-primary"
                    (click)="getCurrentLocation()"
                    [disabled]="isLoadingLocation">
                    <i class="fas fa-location-arrow" *ngIf="!isLoadingLocation"></i>
                    <i class="fas fa-spinner fa-spin" *ngIf="isLoadingLocation"></i>
                    {{ isLoadingLocation ? 'Détection...' : 'Détecter ma position' }}
                  </button>

                  <button
                    type="button"
                    class="btn btn-secondary"
                    (click)="openManualCoordinatesDialog()"
                    [disabled]="isLoadingLocation">
                    <i class="fas fa-edit"></i>
                    Saisir manuellement
                  </button>
                </div>

                <div class="coordinates-grid">
                  <div class="form-group">
                    <label for="latitude">Latitude</label>
                    <input
                      type="number"
                      id="latitude"
                      formControlName="latitude"
                      class="form-control"
                      step="0.000001"
                      placeholder="Ex: 48.856614"
                      (input)="onCoordinateChange()">
                  </div>
                  <div class="form-group">
                    <label for="longitude">Longitude</label>
                    <input
                      type="number"
                      id="longitude"
                      formControlName="longitude"
                      class="form-control"
                      step="0.000001"
                      placeholder="Ex: 2.352222"
                      (input)="onCoordinateChange()">
                  </div>
                </div>

                <div class="location-error" *ngIf="locationError">
                  <i class="fas fa-exclamation-circle"></i>
                  {{ locationError }}
                </div>
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="profileForm.invalid || isUpdatingProfile">
                  <i class="fas fa-save" *ngIf="!isUpdatingProfile"></i>
                  <i class="fas fa-spinner fa-spin" *ngIf="isUpdatingProfile"></i>
                  {{ isUpdatingProfile ? 'Mise à jour...' : 'Mettre à jour le profil' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Password Change -->
        <div class="profile-card">
          <div class="card-header">
            <h2>
              <i class="fas fa-lock"></i>
              Changer le mot de passe
            </h2>
          </div>
          <div class="card-body">
            <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()">
              <div class="form-group">
                <label for="currentPassword">Mot de passe actuel</label>
                <div class="password-input">
                  <input
                    [type]="showCurrentPassword ? 'text' : 'password'"
                    id="currentPassword"
                    formControlName="currentPassword"
                    class="form-control"
                    placeholder="Votre mot de passe actuel">
                  <button
                    type="button"
                    class="toggle-password"
                    (click)="toggleCurrentPassword()">
                    <i [class]="showCurrentPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
                <div class="error-message" *ngIf="passwordForm.get('currentPassword')?.errors?.['required'] && passwordForm.get('currentPassword')?.touched">
                  Le mot de passe actuel est requis
                </div>
              </div>

              <div class="form-group">
                <label for="newPassword">Nouveau mot de passe</label>
                <div class="password-input">
                  <input
                    [type]="showNewPassword ? 'text' : 'password'"
                    id="newPassword"
                    formControlName="newPassword"
                    class="form-control"
                    placeholder="Votre nouveau mot de passe">
                  <button
                    type="button"
                    class="toggle-password"
                    (click)="toggleNewPassword()">
                    <i [class]="showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
                <div class="error-message" *ngIf="passwordForm.get('newPassword')?.errors?.['required'] && passwordForm.get('newPassword')?.touched">
                  Le nouveau mot de passe est requis
                </div>
                <div class="error-message" *ngIf="passwordForm.get('newPassword')?.errors?.['minlength'] && passwordForm.get('newPassword')?.touched">
                  Le mot de passe doit contenir au moins 6 caractères
                </div>
              </div>

              <div class="form-group">
                <label for="confirmPassword">Confirmer le mot de passe</label>
                <div class="password-input">
                  <input
                    [type]="showConfirmPassword ? 'text' : 'password'"
                    id="confirmPassword"
                    formControlName="confirmPassword"
                    class="form-control"
                    placeholder="Confirmez votre nouveau mot de passe">
                  <button
                    type="button"
                    class="toggle-password"
                    (click)="toggleConfirmPassword()">
                    <i [class]="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
                <div class="error-message" *ngIf="passwordForm.get('confirmPassword')?.errors?.['required'] && passwordForm.get('confirmPassword')?.touched">
                  La confirmation du mot de passe est requise
                </div>
                <div class="error-message" *ngIf="passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched">
                  Les mots de passe ne correspondent pas
                </div>
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  class="btn btn-secondary"
                  [disabled]="passwordForm.invalid || isChangingPassword">
                  <i class="fas fa-key" *ngIf="!isChangingPassword"></i>
                  <i class="fas fa-spinner fa-spin" *ngIf="isChangingPassword"></i>
                  {{ isChangingPassword ? 'Modification...' : 'Changer le mot de passe' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <div class="alert alert-success" *ngIf="successMessage">
        <i class="fas fa-check-circle"></i>
        {{ successMessage }}
      </div>
      <div class="alert alert-error" *ngIf="errorMessage">
        <i class="fas fa-exclamation-circle"></i>
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .driver-profile {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;

      .page-header {
        margin-bottom: 24px;
        padding: 24px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        border-radius: 16px;
        color: white;

        h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        p {
          font-size: 16px;
          opacity: 0.9;
          margin: 0;
        }
      }

      .profile-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .profile-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;

        .card-header {
          background: #f8fafc;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;

          h2 {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;

            i {
              color: #ef4444;
            }
          }
        }

        .card-body {
          padding: 24px;
        }
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;

        @media (max-width: 768px) {
          grid-template-columns: 1fr;
        }
      }

      .form-group {
        margin-bottom: 16px;

        label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
          font-size: 14px;
        }

        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;

          &:focus {
            outline: none;
            border-color: #ef4444;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
          }
        }

        textarea.form-control {
          resize: vertical;
          min-height: 80px;
        }

        .error-message {
          color: #dc2626;
          font-size: 12px;
          margin-top: 4px;
        }
      }

      .password-input {
        position: relative;

        .toggle-password {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;

          &:hover {
            color: #374151;
          }
        }
      }

      .form-actions {
        margin-top: 24px;
        display: flex;
        justify-content: flex-end;

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          &.btn-primary {
            background: #ef4444;
            color: white;

            &:hover:not(:disabled) {
              background: #dc2626;
            }
          }

          &.btn-secondary {
            background: #6b7280;
            color: white;

            &:hover:not(:disabled) {
              background: #4b5563;
            }
          }
        }
      }

      .geolocation-section {
        margin-top: 32px;
        padding: 20px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #f9fafb;

        h3 {
          margin: 0 0 16px 0;
          color: #374151;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;

          i {
            color: #ef4444;
          }
        }

        .location-info {
          margin-bottom: 16px;

          .location-status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;

            .text-success {
              color: #059669;
            }

            .text-warning {
              color: #d97706;
            }
          }
        }

        .location-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;

          .btn {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;

            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }

            &.btn-primary {
              background: #ef4444;
              color: white;

              &:hover:not(:disabled) {
                background: #dc2626;
              }
            }

            &.btn-secondary {
              background: #6b7280;
              color: white;

              &:hover:not(:disabled) {
                background: #4b5563;
              }
            }
          }
        }

        .coordinates-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;

          @media (max-width: 768px) {
            grid-template-columns: 1fr;
          }
        }

        .location-error {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #fecaca;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
      }

      .vehicle-section {
        margin-top: 24px;
        padding: 20px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #f8fafc;

        h3 {
          margin: 0 0 16px 0;
          color: #374151;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;

          i {
            color: #3b82f6;
          }
        }
      }

      .alert {
        margin-top: 16px;
        padding: 12px 16px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;

        &.alert-success {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        &.alert-error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
      }
    }
  `]
})
export class DriverProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup;
  passwordForm: FormGroup;

  currentDriver: Driver | null = null;
  currentDriverId: string | null = null;

  isUpdatingProfile = false;
  isChangingPassword = false;

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  successMessage = '';
  errorMessage = '';

  currentLocation: { latitude: number | null; longitude: number | null } = {
    latitude: null,
    longitude: null
  };
  isLoadingLocation = false;
  locationError = '';

  private destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly geolocationService: GeolocationService,
    private readonly driverService: DriverService,
    private readonly authService: AuthenticationService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: [''],
      licenseNumber: [''],
      vehicleType: [''],
      vehiclePlate: [''],
      latitude: [null],
      longitude: [null]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.loadDriverProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  toggleCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid && this.currentDriverId) {
      this.isUpdatingProfile = true;
      this.clearMessages();

      const formData = this.profileForm.value;
      const updateData: Partial<Driver> = {
        name: `${formData.firstName} ${formData.lastName}`,
        displayName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        address: {
          line1: formData.address,
          coordinates: formData.latitude && formData.longitude ? {
            lat: formData.latitude,
            lng: formData.longitude
          } : undefined
        },
        vehicle: {
          type: formData.vehicleType || 'car',
          licensePlate: formData.vehiclePlate || ''
        }
      };

      this.driverService.update(this.currentDriverId, updateData)
        .then(() => {
          this.isUpdatingProfile = false;
          this.successMessage = 'Profil mis à jour avec succès !';
          this.clearMessagesAfterDelay();

          // Update current location if coordinates changed
          if (formData.latitude && formData.longitude) {
            this.currentLocation = {
              latitude: formData.latitude,
              longitude: formData.longitude
            };
          }
        })
        .catch((error) => {
          this.isUpdatingProfile = false;
          this.errorMessage = 'Erreur lors de la mise à jour du profil.';
          this.clearMessagesAfterDelay();
          console.error('Error updating driver profile:', error);
        });
    }
  }

  onChangePassword(): void {
    if (this.passwordForm.valid) {
      this.isChangingPassword = true;
      this.clearMessages();

      // Simulate API call
      setTimeout(() => {
        this.isChangingPassword = false;
        this.successMessage = 'Mot de passe modifié avec succès !';
        this.passwordForm.reset();
        this.clearMessagesAfterDelay();
      }, 2000);
    }
  }

  getCurrentLocation(): void {
    this.isLoadingLocation = true;
    this.locationError = '';

    this.geolocationService.getCurrentPosition()
      .then((position: GeolocationPosition) => {
        this.currentLocation = {
          latitude: position.lat,
          longitude: position.lng
        };

        // Update form values
        this.profileForm.patchValue({
          latitude: position.lat,
          longitude: position.lng
        });

        this.isLoadingLocation = false;
        this.successMessage = `Position détectée avec succès ! Précision: ${Math.round(position.accuracy)}m`;
        this.clearMessagesAfterDelay();
      })
      .catch((error) => {
        this.isLoadingLocation = false;
        this.locationError = error.message || 'Erreur lors de la détection de la position.';
      });
  }

  openManualCoordinatesDialog(): void {
    const latitude = prompt('Entrez la latitude:', this.currentLocation.latitude?.toString() || '');
    const longitude = prompt('Entrez la longitude:', this.currentLocation.longitude?.toString() || '');

    if (latitude !== null && longitude !== null) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        this.currentLocation = {
          latitude: lat,
          longitude: lng
        };

        this.profileForm.patchValue({
          latitude: lat,
          longitude: lng
        });

        this.successMessage = 'Coordonnées mises à jour manuellement !';
        this.clearMessagesAfterDelay();
      } else {
        this.locationError = 'Coordonnées invalides. Latitude: -90 à 90, Longitude: -180 à 180.';
      }
    }
  }

  onCoordinateChange(): void {
    const lat = this.profileForm.get('latitude')?.value;
    const lng = this.profileForm.get('longitude')?.value;

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      this.currentLocation = {
        latitude: lat,
        longitude: lng
      };
      this.locationError = '';
    }
  }

  private loadDriverProfile(): void {
    // Get current user and find associated driver
    const currentUser = this.authService.currentUser();

    if (!currentUser?.uid) {
      this.errorMessage = 'Utilisateur non connecté';
      return;
    }

    // Get user role to find driver ID
    this.authService.getUserRole(currentUser.uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe(userRole => {
        if (userRole?.role === 'driver' && userRole.driverId) {
          this.currentDriverId = userRole.driverId;
          this.loadDriverData(userRole.driverId);
        } else {
          this.errorMessage = 'Profil livreur non trouvé';
        }
      });
  }

  private loadDriverData(driverId: string): void {
    this.driverService.getById(driverId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(driver => {
        if (driver) {
          this.currentDriver = driver;
          this.populateForm(driver);
        } else {
          this.errorMessage = 'Données du livreur non trouvées';
        }
      });
  }

  private populateForm(driver: Driver): void {
    // Split display name into first and last name
    const nameParts = (driver.displayName || driver.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Get coordinates from address or currentLocation
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (driver.address?.coordinates) {
      latitude = driver.address.coordinates.lat;
      longitude = driver.address.coordinates.lng;
    } else if (driver.currentLocation?.position) {
      latitude = driver.currentLocation.position.lat;
      longitude = driver.currentLocation.position.lng;
    }

    // Update current location state
    if (latitude && longitude) {
      this.currentLocation = { latitude, longitude };
    }

    // Populate form with driver data
    this.profileForm.patchValue({
      firstName,
      lastName,
      email: driver.email || '',
      phone: driver.phone || '',
      address: driver.address?.line1 || '',
      licenseNumber: driver.cin || '',
      vehicleType: driver.vehicle?.type || '',
      vehiclePlate: driver.vehicle?.licensePlate || '',
      latitude,
      longitude
    });
  }  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private clearMessagesAfterDelay(): void {
    setTimeout(() => {
      this.clearMessages();
    }, 5000);
  }
}
