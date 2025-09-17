import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { Shipment } from '../../../core/models/shipment.model';
import {
  DeliveryAttempt,
  FailureReason,
  FAILURE_REASON_LABELS,
  DeliveryWindow
} from '../../../core/models/delivery-attempt.model';

export interface DeliveryFailureResult {
  failureReason: FailureReason;
  failureNote: string;
  reschedule: boolean;
  rescheduledDate?: Date;
  rescheduledWindow?: DeliveryWindow;
  clientNotified: boolean;
  clientNotificationMethod?: 'sms' | 'email' | 'call' | 'whatsapp';
  clientResponse?: string;
  proofPhotos?: string[];
  additionalActions: string[];
}

@Component({
  selector: 'app-delivery-failure-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgSelectModule
  ],
  template: `
    <div class="modal-overlay" *ngIf="isVisible" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">

        <!-- En-tête -->
        <div class="modal-header">
          <div class="header-content">
            <i class="fas fa-exclamation-triangle failure-icon"></i>
            <div>
              <h2>Échec de livraison</h2>
              <p class="shipment-info">Colis: {{ shipment?.barcode }}</p>
            </div>
          </div>
          <button class="close-btn" (click)="closeModal()" type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <!-- Contenu -->
        <div class="modal-body">
          <form [formGroup]="failureForm" class="failure-form">

            <!-- Motif de l'échec -->
            <div class="form-section">
              <div class="section-header">
                <i class="fas fa-clipboard-list"></i>
                <h4>Motif de l'échec</h4>
              </div>

              <div class="form-group">
                <label class="form-label required">Raison de l'échec</label>
                <ng-select
                  formControlName="failureReason"
                  placeholder="Sélectionnez un motif"
                  [clearable]="false"
                  bindLabel="label"
                  bindValue="value"
                  [items]="failureReasons">
                  <ng-option *ngFor="let reason of failureReasons" [value]="reason.value">
                    <i [class]="'fas ' + reason.icon + ' reason-icon ' + reason.iconClass"></i>
                    {{ reason.label }}
                  </ng-option>
                </ng-select>
                <div class="error-message" *ngIf="failureForm.get('failureReason')?.hasError('required') && failureForm.get('failureReason')?.touched">
                  Veuillez sélectionner un motif
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Détails supplémentaires</label>
                <textarea
                  class="form-control"
                  formControlName="failureNote"
                  rows="3"
                  placeholder="Décrivez les circonstances de l'échec...">
                </textarea>
              </div>
            </div>

            <!-- Contact client -->
            <div class="form-section">
              <div class="section-header">
                <i class="fas fa-phone"></i>
                <h4>Contact client</h4>
              </div>

              <div class="form-group">
                <div class="form-check">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    id="clientNotified"
                    formControlName="clientNotified">
                  <label class="form-check-label" for="clientNotified">
                    J'ai contacté le client
                  </label>
                </div>
              </div>

              <div *ngIf="failureForm.get('clientNotified')?.value" class="client-contact-details">
                <div class="form-group">
                  <label class="form-label">Méthode de contact</label>
                  <ng-select
                    formControlName="clientNotificationMethod"
                    placeholder="Comment avez-vous contacté le client ?"
                    [clearable]="false">
                    <ng-option value="call">
                      <i class="fas fa-phone"></i> Appel téléphonique
                    </ng-option>
                    <ng-option value="sms">
                      <i class="fas fa-sms"></i> SMS
                    </ng-option>
                    <ng-option value="whatsapp">
                      <i class="fab fa-whatsapp"></i> WhatsApp
                    </ng-option>
                    <ng-option value="email">
                      <i class="fas fa-envelope"></i> Email
                    </ng-option>
                  </ng-select>
                </div>

                <div class="form-group">
                  <label class="form-label">Réponse du client</label>
                  <textarea
                    class="form-control"
                    formControlName="clientResponse"
                    rows="2"
                    placeholder="Résumé de la conversation avec le client...">
                  </textarea>
                </div>
              </div>
            </div>

            <!-- Reprogrammation -->
            <div class="form-section">
              <div class="section-header">
                <i class="fas fa-calendar-alt"></i>
                <h4>Reprogrammation</h4>
              </div>

              <div class="form-group">
                <div class="form-check">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    id="reschedule"
                    formControlName="reschedule">
                  <label class="form-check-label" for="reschedule">
                    Programmer une nouvelle tentative
                  </label>
                </div>
              </div>

              <div *ngIf="failureForm.get('reschedule')?.value" class="reschedule-details">
                <div class="row">
                  <div class="col-md-4">
                    <div class="form-group">
                      <label class="form-label">Nouvelle date</label>
                      <input
                        type="date"
                        class="form-control"
                        formControlName="rescheduledDate"
                        [min]="minDateString">
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label class="form-label">Heure de début</label>
                      <ng-select
                        formControlName="startTime"
                        placeholder="Début"
                        [items]="timeSlots">
                      </ng-select>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label class="form-label">Heure de fin</label>
                      <ng-select
                        formControlName="endTime"
                        placeholder="Fin"
                        [items]="timeSlots">
                      </ng-select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions supplémentaires -->
            <div class="form-section">
              <div class="section-header">
                <i class="fas fa-tasks"></i>
                <h4>Actions supplémentaires</h4>
              </div>

              <div class="action-chips">
                <div class="form-check form-check-inline" *ngFor="let action of additionalActionsList">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    [id]="action.value"
                    [value]="action.value"
                    (change)="onActionChange($event)">
                  <label class="form-check-label action-chip" [for]="action.value">
                    <i [class]="'fas ' + action.icon"></i>
                    {{ action.label }}
                  </label>
                </div>
              </div>
            </div>

          </form>
        </div>

        <!-- Actions -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="closeModal()">
            <i class="fas fa-times"></i>
            Annuler
          </button>

          <button
            type="button"
            class="btn btn-danger"
            (click)="onConfirm()"
            [disabled]="!failureForm.valid">
            <i class="fas fa-save"></i>
            Enregistrer l'échec
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 700px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .failure-icon {
      font-size: 28px;
      color: #dc3545;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .shipment-info {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      color: #666;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .failure-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      border: 1px solid #e9ecef;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #dee2e6;
    }

    .section-header i {
      color: #6c757d;
      font-size: 16px;
    }

    .section-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .form-label.required::after {
      content: ' *';
      color: #dc3545;
    }

    .form-control {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.15s;
    }

    .form-control:focus {
      outline: none;
      border-color: #86b7fe;
      box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
    }

    .form-check {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .form-check-input {
      margin: 0;
    }

    .form-check-label {
      font-size: 14px;
      color: #333;
      cursor: pointer;
    }

    .client-contact-details,
    .reschedule-details {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #dee2e6;
    }

    .action-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .action-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #e9ecef;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }

    .action-chip:hover {
      background: #dee2e6;
    }

    .form-check-input:checked + .action-chip {
      background: #d4edda;
      color: #155724;
      border-color: #c3e6cb;
    }

    .reason-icon {
      margin-right: 6px;
      font-size: 14px;
    }

    .reason-icon.critical { color: #dc3545; }
    .reason-icon.warning { color: #fd7e14; }
    .reason-icon.info { color: #0dcaf0; }
    .reason-icon.success { color: #198754; }

    .error-message {
      color: #dc3545;
      font-size: 12px;
      margin-top: 4px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px 20px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fa;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border: 1px solid transparent;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
      text-decoration: none;
    }

    .btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .btn-secondary {
      color: #6c757d;
      background-color: #f8f9fa;
      border-color: #dee2e6;
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: #e9ecef;
      border-color: #adb5bd;
    }

    .btn-danger {
      color: #fff;
      background-color: #dc3545;
      border-color: #dc3545;
    }

    .btn-danger:hover:not(:disabled) {
      background-color: #c82333;
      border-color: #bd2130;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .modal-overlay {
        padding: 10px;
      }

      .modal-content {
        max-width: none;
        width: 100%;
        max-height: 95vh;
      }

      .modal-header,
      .modal-body,
      .modal-footer {
        padding-left: 16px;
        padding-right: 16px;
      }

      .modal-footer {
        flex-direction: column-reverse;
      }

      .modal-footer .btn {
        width: 100%;
        justify-content: center;
      }

      .action-chips {
        flex-direction: column;
      }

      .form-check-inline {
        width: 100%;
      }

      .action-chip {
        width: 100%;
        justify-content: flex-start;
      }
    }

    /* ng-select custom styles */
    ::ng-deep .ng-select {
      min-height: 42px;
    }

    ::ng-deep .ng-select.ng-select-focused .ng-select-container {
      border-color: #86b7fe;
      box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
    }

    ::ng-deep .ng-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class DeliveryFailureModalComponent implements OnInit {
  @Input() isVisible = false;
  @Input() shipment: Shipment | null = null;
  @Input() driverId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<DeliveryFailureResult>();

  failureForm: FormGroup;
  minDateString = new Date().toISOString().split('T')[0];

  // Options pré-définies
  failureReasons = [
    { value: 'address_not_found', label: 'Adresse introuvable', icon: 'fa-map-marker-times', iconClass: 'critical' },
    { value: 'recipient_unavailable', label: 'Destinataire absent', icon: 'fa-user-times', iconClass: 'warning' },
    { value: 'wrong_address', label: 'Adresse incorrecte', icon: 'fa-map-marker-alt', iconClass: 'critical' },
    { value: 'recipient_refused', label: 'Destinataire refuse', icon: 'fa-ban', iconClass: 'warning' },
    { value: 'payment_refused', label: 'Refus de paiement', icon: 'fa-credit-card', iconClass: 'critical' },
    { value: 'damaged_package', label: 'Colis endommagé', icon: 'fa-box-open', iconClass: 'critical' },
    { value: 'security_issue', label: 'Problème de sécurité', icon: 'fa-shield-alt', iconClass: 'critical' },
    { value: 'weather_conditions', label: 'Conditions météo', icon: 'fa-cloud-rain', iconClass: 'info' },
    { value: 'vehicle_breakdown', label: 'Panne véhicule', icon: 'fa-tools', iconClass: 'critical' },
    { value: 'access_restricted', label: 'Accès restreint', icon: 'fa-lock', iconClass: 'warning' },
    { value: 'incomplete_address', label: 'Adresse incomplète', icon: 'fa-search-location', iconClass: 'warning' },
    { value: 'other', label: 'Autre motif', icon: 'fa-question-circle', iconClass: 'info' }
  ];

  timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
  ];

  additionalActionsList = [
    { value: 'photo_proof', label: 'Photos prises', icon: 'fa-camera' },
    { value: 'neighbor_contacted', label: 'Voisins contactés', icon: 'fa-users' },
    { value: 'safe_place_checked', label: 'Lieu sûr vérifié', icon: 'fa-shield-alt' },
    { value: 'access_issue', label: 'Problème d\'accès', icon: 'fa-door-closed' },
    { value: 'return_to_depot', label: 'Retour dépôt', icon: 'fa-warehouse' }
  ];

  constructor(private fb: FormBuilder) {
    this.failureForm = this.fb.group({
      failureReason: ['', Validators.required],
      failureNote: [''],
      clientNotified: [false],
      clientNotificationMethod: [''],
      clientResponse: [''],
      reschedule: [false],
      rescheduledDate: [''],
      startTime: [''],
      endTime: [''],
      additionalActions: [[]]
    });
  }

  ngOnInit(): void {
    this.setupConditionalValidators();
  }

  private setupConditionalValidators(): void {
    // Validation pour contact client
    this.failureForm.get('clientNotified')?.valueChanges.subscribe(notified => {
      const methodControl = this.failureForm.get('clientNotificationMethod');
      if (notified) {
        methodControl?.setValidators(Validators.required);
      } else {
        methodControl?.clearValidators();
      }
      methodControl?.updateValueAndValidity();
    });

    // Validation pour reprogrammation
    this.failureForm.get('reschedule')?.valueChanges.subscribe(reschedule => {
      const dateControl = this.failureForm.get('rescheduledDate');
      const startTimeControl = this.failureForm.get('startTime');
      const endTimeControl = this.failureForm.get('endTime');

      if (reschedule) {
        dateControl?.setValidators(Validators.required);
        startTimeControl?.setValidators(Validators.required);
        endTimeControl?.setValidators(Validators.required);
      } else {
        dateControl?.clearValidators();
        startTimeControl?.clearValidators();
        endTimeControl?.clearValidators();
      }

      dateControl?.updateValueAndValidity();
      startTimeControl?.updateValueAndValidity();
      endTimeControl?.updateValueAndValidity();
    });
  }

  onActionChange(event: any): void {
    const currentActions = this.failureForm.get('additionalActions')?.value || [];
    const actionValue = event.target.value;

    if (event.target.checked) {
      if (!currentActions.includes(actionValue)) {
        currentActions.push(actionValue);
      }
    } else {
      const index = currentActions.indexOf(actionValue);
      if (index > -1) {
        currentActions.splice(index, 1);
      }
    }

    this.failureForm.get('additionalActions')?.setValue(currentActions);
  }

  closeModal(): void {
    this.isVisible = false;
    this.closed.emit();
  }

  onConfirm(): void {
    if (this.failureForm.valid) {
      const formValue = this.failureForm.value;

      const result: DeliveryFailureResult = {
        failureReason: formValue.failureReason,
        failureNote: formValue.failureNote,
        reschedule: formValue.reschedule,
        clientNotified: formValue.clientNotified,
        additionalActions: formValue.additionalActions || []
      };

      // Ajout des données de contact si le client a été contacté
      if (formValue.clientNotified) {
        result.clientNotificationMethod = formValue.clientNotificationMethod;
        result.clientResponse = formValue.clientResponse;
      }

      // Ajout des données de reprogrammation si applicable
      if (formValue.reschedule) {
        result.rescheduledDate = new Date(formValue.rescheduledDate);
        result.rescheduledWindow = {
          startTime: formValue.startTime,
          endTime: formValue.endTime
        };
      }

      this.confirmed.emit(result);
      this.closeModal();
    }
  }
}
