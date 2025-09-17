import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ToastrService } from 'ngx-toastr';

import { PageTitleComponent } from '../../../../shared/ui/pagetitle/pagetitle.component';
import { Driver, DriverZone } from '../../../../core/models/driver.model';
import { DriverService } from '../../../../core/services/driver.service';
import { ShipmentService } from '../../../../core/services/shipment.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { TUNISIA_CITIES } from '../../../../shared/data/tunisia-cities';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ModalModule, PageTitleComponent, NgSelectModule],
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.css']
})
export class DetailComponent implements OnInit {
  driver?: Driver;
  driverId?: string;
  loading = false;
  loadingKpis = false;
  cities = TUNISIA_CITIES;

  // KPIs
  stats = {
    delivered: 0,
    inProgress: 0,
    returned: 0,
    cod: 0
  };

  form: FormGroup;
  breadCrumbItems = [
    { label: 'Livreurs', link: '/megafast/drivers' },
    { label: 'Détail', active: true }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly driverService: DriverService,
    private readonly shipmentService: ShipmentService,
    private readonly toastr: ToastrService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.email]],
      vehicle: [''],
      cin: [''],
      zones: [[] as string[]],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.driverId = params['id'];
      if (this.driverId) {
        this.loadDriver();
        this.loadKpis();
      }
    });
  }

  private loadDriver() {
    if (!this.driverId) return;
    this.loading = true;
    this.driverService.getById(this.driverId).subscribe({
      next: (driver) => {
        if (!driver) {
          this.toastr.error('Livreur introuvable');
          this.router.navigate(['/megafast/drivers']);
          return;
        }
        this.driver = driver;
        this.breadCrumbItems[1].label = driver.displayName || driver.name;
        this.form.patchValue({
          name: driver.name,
          displayName: driver.displayName,
          phone: driver.phone,
          email: driver.email,
          vehicle: driver.vehicle,
          cin: driver.cin,
          zones: driver.zones || [],
          active: driver.active !== false
        });
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Erreur de chargement');
        this.loading = false;
      }
    });
  }

  private loadKpis() {
    if (!this.driverId) return;
    this.loadingKpis = true;
    this.shipmentService.list({ assignedTo: this.driverId }).subscribe({
      next: (items: any[]) => {
        let delivered = 0, inProgress = 0, returned = 0, cod = 0;
        for (const s of items) {
          if (s.status === 'delivered' || s.status === 'livre') { delivered++; cod += s.amount || 0; }
          else if (s.status === 'assigned' || s.status === 'in_transit') { inProgress++; }
          else if (s.status === 'returned') { returned++; }
        }
        this.stats = { delivered, inProgress, returned, cod };
        this.loadingKpis = false;
      },
      error: () => { this.loadingKpis = false; }
    });
  }

  async save() {
    if (!this.driver?.id || this.form.invalid) return;
  const v = this.form.value;
  const zoneStrings = (v.zones || []) as string[];
  const zones: DriverZone[] = zoneStrings.map((zoneName, index) => ({
    id: `zone_${index + 1}`,
    name: zoneName,
    type: 'assigned' as const,
    coordinates: [],
    priority: index + 1,
    active: true
  }));

    try {
      await this.driverService.update(this.driver.id, {
        name: v.name,
        displayName: v.displayName,
        phone: v.phone,
        email: v.email || '',
        vehicle: v.vehicle || '',
        cin: v.cin || '',
        zones,
        active: !!v.active
      });
      this.toastr.success('Livreur mis à jour');
      this.loadDriver();
    } catch (err) {
      console.error('update driver failed', err);
      this.toastr.error('Échec de la mise à jour');
    }
  }

  async toggleActive() {
    if (!this.driver?.id) return;
    try {
      await this.driverService.update(this.driver.id, { active: !this.driver.active });
      this.toastr.success(this.driver.active ? 'Livreur désactivé' : 'Livreur activé');
      this.loadDriver();
    } catch (err) {
      console.error('toggle active failed', err);
      this.toastr.error('Action impossible');
    }
  }

  async delete() {
    if (!this.driver?.id) return;
    if (!confirm('Supprimer ce livreur ?')) return;
    try {
      await this.driverService.delete(this.driver.id);
      this.toastr.success('Livreur supprimé');
      this.router.navigate(['/megafast/drivers']);
    } catch (err) {
      console.error('delete driver failed', err);
      this.toastr.error('Suppression impossible');
    }
  }
}
