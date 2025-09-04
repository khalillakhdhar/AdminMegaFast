import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PageTitleComponent } from '../../../../shared/ui/pagetitle/pagetitle.component';
import { BatchService } from '../../../../core/services/batch.service';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PageTitleComponent],
  templateUrl: './create.component.html',
  styleUrl: './create.component.css'
})
export class CreateComponent {
  breadCrumbItems = [
    { label: 'MegaFast', active: false },
    { label: 'Lots', active: false, link: '/megafast/batches' },
    { label: 'Créer', active: true }
  ];

  form: FormGroup;
  saving = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly batchService: BatchService
  ) {
    this.form = this.fb.group({
      code: [''],
      assignedTo: [''],
      plannedAt: [null],
      status: ['planned', Validators.required]
    });
  }

  async submit() {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    try {
      const v = this.form.value;
      const batch = {
        code: v.code || undefined,
        assignedTo: v.assignedTo || '',
        plannedAt: v.plannedAt || null,
        status: v.status,
        totalAmount: 0,
        totalShipments: 0,
        deliveredShipments: 0
      } as any;
      const ref = await this.batchService.create(batch);
      this.toastr.success('Lot créé');
      await this.router.navigate(['/megafast/batches', ref.id]);
    } catch (e) {
      console.error('create batch failed', e);
      this.toastr.error('Erreur lors de la création du lot');
    } finally {
      this.saving = false;
    }
  }
}
