import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription, combineLatest, map, of } from 'rxjs';

import { Driver } from '../../../../core/models/driver.model';
import { DriverService } from '../../../../core/services/driver.service';
import { ShipmentService } from '../../../../core/services/shipment.service';
import { ToastrService } from 'ngx-toastr';
import { PageTitleComponent } from '../../../../shared/ui/pagetitle/pagetitle.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TUNISIA_CITIES } from '../../../../shared/data/tunisia-cities';

interface DriverKpi {
  delivered: number;
  inProgress: number;
  returned: number;
  cod: number;
}

@Component({
  selector: 'app-drivers-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, PageTitleComponent, NgSelectModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListComponent implements OnInit, OnDestroy {
  // UI state
  loading = false;
  loadingKpi = false;

  // Data
  drivers: Driver[] = [];
  filtered: Driver[] = [];
  kpis = new Map<string, DriverKpi>();

  // Filters
  q = '';
  status: 'all' | 'active' | 'inactive' = 'all';
  zone = '';
  cities = TUNISIA_CITIES;
  selectedZones: string[] = [];

  // Sorting
  sortField: 'createdAt' | 'name' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';

  // Pagination (simple client-side)
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  private sub?: Subscription;
  private kpiSub?: Subscription;

  constructor(
  private readonly driverService: DriverService,
    private readonly shipmentService: ShipmentService,
  private readonly toastr: ToastrService,
  private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.sub = this.driverService.getAll().subscribe({
      next: (drivers) => {
        this.drivers = drivers || [];
  this.applyFilters();
  this.loading = false;
  this.cdr.markForCheck();
        this.loadKpis();
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Erreur lors du chargement des livreurs');
      },
    });
  }

  private loadKpis(): void {
    this.kpis.clear();
    if (!this.drivers.length) return;
    this.loadingKpi = true;

    const streams = this.drivers.map((d) =>
      this.shipmentService
        .list({ assignedTo: d.id })
        .pipe(
          map((items: any[]) => {
            let delivered = 0,
              inProgress = 0,
              returned = 0,
              cod = 0;
            for (const s of items) {
              if (s.status === 'delivered' || s.status === 'livre') {
                delivered++;
                cod += s.amount || 0;
              } else if (s.status === 'assigned' || s.status === 'in_transit') {
                inProgress++;
              } else if (s.status === 'returned') {
                returned++;
              }
            }
            return { id: String(d.id), kpi: { delivered, inProgress, returned, cod } };
          })
        )
    );

    this.kpiSub?.unsubscribe();
    this.kpiSub = (streams.length ? combineLatest(streams) : of([])).subscribe({
      next: (all: any[]) => {
        all.forEach((x: any) => this.kpis.set(x.id, x.kpi));
        this.loadingKpi = false;
      },
      error: () => {
        this.loadingKpi = false;
      },
    });
  }

  applyFilters(): void {
    let arr = [...this.drivers];
    const term = this.q.trim().toLowerCase();
    if (term) {
      arr = arr.filter(
        (d) =>
          (d.displayName || d.name || '').toLowerCase().includes(term) ||
          (d.phone || '').includes(term) ||
          (d.email || '').toLowerCase().includes(term)
      );
    }
    if (this.status !== 'all') {
      arr = arr.filter((d) => (this.status === 'active' ? d.active : !d.active));
    }
    if (this.selectedZones?.length) {
      const set = new Set(this.selectedZones.map(z => z.toLowerCase()));
      arr = arr.filter((d) => (d.zones || []).some((x) => set.has((typeof x === 'string' ? x : x.name || '').toLowerCase())));
    }

    // sort
    arr.sort((a, b) => {
      const av = this.sortField === 'name' ? (a.displayName || a.name || '') : (a.createdAt?.toDate?.() || a.createdAt || 0);
      const bv = this.sortField === 'name' ? (b.displayName || b.name || '') : (b.createdAt?.toDate?.() || b.createdAt || 0);
      let cmp = 0;
      if (av > bv) cmp = 1;
      else if (av < bv) cmp = -1;
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filtered = arr;
    this.totalItems = arr.length;
    this.currentPage = 1;
  }

  getPage(): Driver[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  trackById(_: number, d: Driver) {
    return d.id;
  }

  toggleActive(d: Driver) {
    if (!d.id) return;
    this.driverService
      .update(d.id, { active: !d.active })
      .then(() => this.toastr.success(d.active ? 'Livreur désactivé' : 'Livreur activé'))
      .catch(() => this.toastr.error('Action impossible'));
  }

  /**
   * Create account for existing driver
   */
  createAccountForDriver(driverId: string): void {
    const driver = this.drivers.find(d => d.id === driverId);

    if (!driver) {
      this.toastr.error('Livreur non trouvé');
      return;
    }

    if (!driver.email) {
      this.toastr.error('L\'email du livreur est requis pour créer un compte');
      return;
    }

    if (driver.hasAccount) {
      this.toastr.warning('Ce livreur a déjà un compte utilisateur');
      return;
    }

    // Confirm account creation
    if (confirm(`Créer un compte utilisateur pour ${driver.name} (${driver.email}) ?`)) {
      this.driverService.createAccountForDriver(driverId).then(() => {
        // Reload drivers to get updated data
        this.ngOnInit();
      }).catch(error => {
        this.toastr.error('Erreur lors de la création du compte: ' + (error.message || error));
      });
    }
  }

  /**
   * Reset driver password
   */
  resetDriverPassword(driverId: string): void {
    const driver = this.drivers.find(d => d.id === driverId);

    if (!driver) {
      this.toastr.error('Livreur non trouvé');
      return;
    }

    if (!driver.hasAccount) {
      this.toastr.error('Ce livreur n\'a pas de compte utilisateur');
      return;
    }

    // Confirm password reset
    if (confirm(`Envoyer un email de réinitialisation du mot de passe à ${driver.name} (${driver.email}) ?`)) {
      this.driverService.resetDriverPassword(driverId).then(() => {
        // Success message is shown by the service
      }).catch(error => {
        this.toastr.error('Erreur lors de la réinitialisation: ' + (error.message || error));
      });
    }
  }

  /**
   * Disable driver account
   */
  disableDriverAccount(driverId: string): void {
    const driver = this.drivers.find(d => d.id === driverId);

    if (!driver) {
      this.toastr.error('Livreur non trouvé');
      return;
    }

    if (!driver.hasAccount) {
      this.toastr.error('Ce livreur n\'a pas de compte utilisateur');
      return;
    }

    // Confirm account disabling
    if (confirm(`Désactiver le compte utilisateur de ${driver.name} ?`)) {
      this.driverService.disableAccount(driverId).then(() => {
        this.ngOnInit();
      }).catch(error => {
        this.toastr.error('Erreur lors de la désactivation: ' + (error.message || error));
      });
    }
  }

  /**
   * Enable driver account
   */
  enableDriverAccount(driverId: string): void {
    const driver = this.drivers.find(d => d.id === driverId);

    if (!driver) {
      this.toastr.error('Livreur non trouvé');
      return;
    }

    if (!driver.hasAccount) {
      this.toastr.error('Ce livreur n\'a pas de compte utilisateur');
      return;
    }

    // Confirm account enabling
    if (confirm(`Réactiver le compte utilisateur de ${driver.name} ?`)) {
      this.driverService.enableAccount(driverId).then(() => {
        this.ngOnInit();
      }).catch(error => {
        this.toastr.error('Erreur lors de la réactivation: ' + (error.message || error));
      });
    }
  }

  /**
   * Check if driver has account
   */
  hasAccount(driver: Driver): boolean {
    return !!driver.hasAccount;
  }

  /**
   * Get account status text
   */
  getAccountStatusText(driver: Driver): string {
    if (driver.hasAccount) {
      return driver.isActive ? 'Compte actif' : 'Compte désactivé';
    }
    return 'Pas de compte';
  }

  /**
   * Get account status class
   */
  getAccountStatusClass(driver: Driver): string {
    if (driver.hasAccount) {
      return driver.isActive ? 'badge bg-success' : 'badge bg-warning';
    }
    return 'badge bg-secondary';
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }
  nextPage() {
    if (this.currentPage * this.pageSize < this.totalItems) this.currentPage++;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.kpiSub?.unsubscribe();
  }
}

