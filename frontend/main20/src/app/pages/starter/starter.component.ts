import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TablerIconsModule } from 'angular-tabler-icons';
import { Subscription } from 'rxjs';

import {
  AdminDashboardFinance,
  AdminDashboardFinanceQuery,
  AdminService,
} from 'src/app/services/admin.service';
import { AuthService } from 'src/app/services/auth.service';
import { MaterialModule } from '../../material.module';

type Tone = 'primary' | 'success' | 'warning' | 'error' | 'secondary';

interface KpiCard {
  key: string;
  label: string;
  value: string;
  subLabel?: string;
  icon: string;
  toneClass: string;
}

interface BreakdownItem {
  key: string;
  label: string;
  amountFormatted: string;
  count: number;
  share: number;
}

interface PaymentRow {
  key: string;
  label: string;
  count: number;
  amountFormatted: string;
  countShare: number;
  amountShare: number;
  toneClass: string;
}

interface StatRow {
  key: string;
  label: string;
  value: number;
  toneClass: string;
}

@Component({
  selector: 'app-starter',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, TablerIconsModule],
  templateUrl: './starter.component.html',
  styleUrls: ['./starter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarterComponent implements OnInit, OnDestroy {
  isAdmin = false;
  isLoading = false;
  errorMessage = '';
  dashboard: AdminDashboardFinance | null = null;
  lastUpdated: string | null = null;

  filterForm = new FormGroup({
    startDate: new FormControl<string | null>(null),
    endDate: new FormControl<string | null>(null),
    topN: new FormControl<number | null>(5, {
      validators: [Validators.min(1), Validators.max(50)],
    }),
  });

  kpiCards: KpiCard[] = [];
  paymentRows: PaymentRow[] = [];
  revenueByZone: BreakdownItem[] = [];
  revenueByEtage: BreakdownItem[] = [];
  revenueByType: BreakdownItem[] = [];
  revenueByBoutique: BreakdownItem[] = [];
  demandeStatusRows: StatRow[] = [];
  boutiqueStatusRows: StatRow[] = [];
  userRoleRows: StatRow[] = [];

  collectionRatePercent = 0;
  paymentRatePercent = 0;
  occupancyRatePercent = 0;
  satisfactionNote = 0;
  avgDecisionDays = 0;
  minDecisionDays = 0;
  maxDecisionDays = 0;

  private readonly subscriptions = new Subscription();
  private readonly numberFormatter = new Intl.NumberFormat('fr-FR');
  private readonly toneClassMap: Record<Tone, string> = {
    primary: 'bg-light-primary text-primary',
    success: 'bg-light-success text-success',
    warning: 'bg-light-warning text-warning',
    error: 'bg-light-error text-error',
    secondary: 'bg-light-secondary text-secondary',
  };

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.getCurrentRole() === 'admin';
    if (this.isAdmin) {
      this.loadDashboard();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  applyFilters(): void {
    if (!this.isAdmin) {
      return;
    }
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.errorMessage = 'Les filtres sont invalides.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.isDateRangeValid()) {
      this.cdr.markForCheck();
      return;
    }
    this.loadDashboard();
  }

  resetFilters(): void {
    this.filterForm.reset({
      startDate: null,
      endDate: null,
      topN: 5,
    });
    this.applyFilters();
  }

  private isDateRangeValid(): boolean {
    const { startDate, endDate } = this.filterForm.getRawValue();
    if (!startDate || !endDate) {
      return true;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return true;
    }
    if (start.getTime() > end.getTime()) {
      this.errorMessage = 'La date de debut doit preceder la date de fin.';
      return false;
    }
    return true;
  }

  private loadDashboard(): void {
    const { startDate, endDate, topN } = this.filterForm.getRawValue();
    const query: AdminDashboardFinanceQuery = {
      startDate: startDate ? this.toStartDateIso(startDate) : undefined,
      endDate: endDate ? this.toEndDateIso(endDate) : undefined,
      topN: topN ?? undefined,
    };

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const sub = this.adminService.getDashboardFinance(query).subscribe({
      next: (response) => {
        this.dashboard = response?.data ?? null;
        this.lastUpdated = response?.date ?? null;
        if (this.dashboard) {
          this.mapDashboard(this.dashboard);
        } else {
          this.resetDerived();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message ?? 'Impossible de charger le dashboard.';
        this.dashboard = null;
        this.resetDerived();
        this.cdr.markForCheck();
      },
    });

    this.subscriptions.add(sub);
  }

  private mapDashboard(data: AdminDashboardFinance): void {
    this.collectionRatePercent = this.toPercentNumber(
      data.location.revenueExpected > 0
        ? data.location.revenueCollected / data.location.revenueExpected
        : 0,
    );
    this.paymentRatePercent = this.toPercentNumber(data.location.paymentRate);
    this.occupancyRatePercent = this.toPercentNumber(data.occupancy.occupancyRate);
    this.satisfactionNote =
      data.display?.satisfactionNote ?? data.satisfaction?.noteMoyenne ?? 0;
    this.avgDecisionDays = data.display?.avgDecisionDays ?? data.demandesLocation.avgDecisionDays;
    this.minDecisionDays = data.demandesLocation.minDecisionDays;
    this.maxDecisionDays = data.demandesLocation.maxDecisionDays;

    this.paymentRows = this.buildPaymentRows(data);
    this.revenueByZone = this.buildBreakdown(data.location.revenueByZone, (item) => item.zone);
    this.revenueByEtage = this.buildBreakdown(
      data.location.revenueByEtage,
      (item) => `Etage ${item.etage}`,
    );
    this.revenueByType = this.buildBreakdown(
      data.location.revenueByType,
      (item) => item.typeNom,
    );
    this.revenueByBoutique = this.buildBreakdown(
      data.location.revenueByBoutique,
      (item) => item.boutiqueNom,
    );
    this.demandeStatusRows = this.buildDemandeStatusRows(data);
    this.boutiqueStatusRows = this.buildBoutiqueStatusRows(data);
    this.userRoleRows = this.buildUserRoleRows(data);
    this.kpiCards = this.buildKpiCards(data);
  }

  private resetDerived(): void {
    this.kpiCards = [];
    this.paymentRows = [];
    this.revenueByZone = [];
    this.revenueByEtage = [];
    this.revenueByType = [];
    this.revenueByBoutique = [];
    this.demandeStatusRows = [];
    this.boutiqueStatusRows = [];
    this.userRoleRows = [];
    this.collectionRatePercent = 0;
    this.paymentRatePercent = 0;
    this.occupancyRatePercent = 0;
    this.satisfactionNote = 0;
    this.avgDecisionDays = 0;
    this.minDecisionDays = 0;
    this.maxDecisionDays = 0;
  }

  private buildKpiCards(data: AdminDashboardFinance): KpiCard[] {
    const display = data.display;
    const revenueCollected =
      display?.revenueCollected ?? this.formatAmount(data.location.revenueCollected, data.currency);
    const revenueExpected =
      display?.revenueExpected ?? this.formatAmount(data.location.revenueExpected, data.currency);
    const pendingAmount =
      display?.pendingAmount ?? this.formatAmount(data.location.pendingAmount, data.currency);
    const arrearsAmount =
      display?.arrearsAmount ?? this.formatAmount(data.location.arrears.amount, data.currency);
    const averageRent =
      display?.averageRentPerBox ??
      this.formatAmount(data.location.averageRentPerBox, data.currency);
    const revenuePerM2 =
      display?.revenuePerM2 ?? this.formatAmount(data.location.revenuePerM2, data.currency);
    const paymentRate = display?.paymentRate ?? this.toPercentLabel(data.location.paymentRate);
    const occupancyRate = display?.occupancyRate ?? this.toPercentLabel(data.occupancy.occupancyRate);

    return [
      {
        key: 'revenue-collected',
        label: 'Revenus encaisses',
        value: revenueCollected,
        subLabel: `${data.location.revenueCollectedCount} paiement(s) valides`,
        icon: 'cash',
        toneClass: this.toneClassMap.primary,
      },
      {
        key: 'revenue-expected',
        label: 'Revenus attendus',
        value: revenueExpected,
        subLabel: `${data.location.payments.counts.total} paiement(s) total`,
        icon: 'target',
        toneClass: this.toneClassMap.secondary,
      },
      {
        key: 'payment-rate',
        label: 'Taux encaissement',
        value: paymentRate,
        subLabel: `En attente: ${pendingAmount}`,
        icon: 'percentage',
        toneClass: this.toneClassMap.success,
      },
      {
        key: 'arrears',
        label: 'Impayes',
        value: arrearsAmount,
        subLabel: `${data.location.arrears.count} dossier(s)`,
        icon: 'alert-circle',
        toneClass: this.toneClassMap.error,
      },
      {
        key: 'occupancy',
        label: 'Taux occupation',
        value: occupancyRate,
        subLabel: `${data.occupancy.occupiedBoxes}/${data.occupancy.totalBoxes} boxes`,
        icon: 'box',
        toneClass: this.toneClassMap.primary,
      },
      {
        key: 'average-rent',
        label: 'Loyer moyen / box',
        value: averageRent,
        subLabel: `Revenu m2: ${revenuePerM2}`,
        icon: 'building-store',
        toneClass: this.toneClassMap.secondary,
      },
      {
        key: 'requests',
        label: 'Demandes location',
        value: String(data.demandesLocation.counts.total),
        subLabel: `${data.demandesLocation.counts.en_attente} en attente`,
        icon: 'clipboard-check',
        toneClass: this.toneClassMap.warning,
      },
      {
        key: 'clients',
        label: 'Clients actifs',
        value: String(data.users.clientsActifs),
        subLabel: `${data.users.total} utilisateurs`,
        icon: 'users',
        toneClass: this.toneClassMap.primary,
      },
    ];
  }

  private buildPaymentRows(data: AdminDashboardFinance): PaymentRow[] {
    const counts = data.location.payments.counts;
    const amounts = data.location.payments.amounts;
    const totalCount = counts.total || 0;
    const totalAmount = amounts.total || 0;

    return [
      {
        key: 'valide',
        label: 'Valides',
        count: counts.valide,
        amountFormatted: this.formatAmount(amounts.valide, data.currency),
        countShare: totalCount ? counts.valide / totalCount : 0,
        amountShare: totalAmount ? amounts.valide / totalAmount : 0,
        toneClass: this.toneClassMap.success,
      },
      {
        key: 'en_attente',
        label: 'En attente',
        count: counts.en_attente,
        amountFormatted: this.formatAmount(amounts.en_attente, data.currency),
        countShare: totalCount ? counts.en_attente / totalCount : 0,
        amountShare: totalAmount ? amounts.en_attente / totalAmount : 0,
        toneClass: this.toneClassMap.warning,
      },
      {
        key: 'rejete',
        label: 'Rejetes',
        count: counts.rejete,
        amountFormatted: this.formatAmount(amounts.rejete, data.currency),
        countShare: totalCount ? counts.rejete / totalCount : 0,
        amountShare: totalAmount ? amounts.rejete / totalAmount : 0,
        toneClass: this.toneClassMap.error,
      },
    ];
  }

  private buildBreakdown<T extends { amount: number; amountFormatted?: string; count: number }>(
    items: T[],
    labelResolver: (item: T) => string,
  ): BreakdownItem[] {
    const safeItems = items ?? [];
    const total = safeItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    return safeItems.map((item, index) => ({
      key: `${labelResolver(item)}-${index}`,
      label: labelResolver(item) || 'Non renseigne',
      amountFormatted:
        item.amountFormatted ?? this.formatAmount(item.amount || 0, this.dashboard?.currency),
      count: item.count ?? 0,
      share: total ? (item.amount || 0) / total : 0,
    }));
  }

  private buildDemandeStatusRows(data: AdminDashboardFinance): StatRow[] {
    const counts = data.demandesLocation.counts;
    return [
      {
        key: 'attente',
        label: 'En attente',
        value: counts.en_attente,
        toneClass: this.toneClassMap.warning,
      },
      {
        key: 'validee',
        label: 'Validees',
        value: counts.validee,
        toneClass: this.toneClassMap.success,
      },
      {
        key: 'rejetee',
        label: 'Rejetees',
        value: counts.rejetee,
        toneClass: this.toneClassMap.error,
      },
      {
        key: 'annulee',
        label: 'Annulees',
        value: counts.annulee,
        toneClass: this.toneClassMap.secondary,
      },
      {
        key: 'total',
        label: 'Total',
        value: counts.total,
        toneClass: this.toneClassMap.primary,
      },
    ];
  }

  private buildBoutiqueStatusRows(data: AdminDashboardFinance): StatRow[] {
    const counts = data.boutiques.byStatus;
    return [
      {
        key: 'active',
        label: 'Actives',
        value: counts.active,
        toneClass: this.toneClassMap.success,
      },
      {
        key: 'suspendue',
        label: 'Suspendues',
        value: counts.suspendue,
        toneClass: this.toneClassMap.error,
      },
      {
        key: 'attente',
        label: 'En attente',
        value: counts.en_attente,
        toneClass: this.toneClassMap.warning,
      },
      {
        key: 'rejetees',
        label: 'Rejetees',
        value: counts.rejetee,
        toneClass: this.toneClassMap.secondary,
      },
      {
        key: 'total',
        label: 'Total',
        value: counts.total,
        toneClass: this.toneClassMap.primary,
      },
    ];
  }

  private buildUserRoleRows(data: AdminDashboardFinance): StatRow[] {
    const counts = data.users.byRole;
    return [
      {
        key: 'admin',
        label: 'Admins',
        value: counts.admin,
        toneClass: this.toneClassMap.primary,
      },
      {
        key: 'boutique',
        label: 'Boutiques',
        value: counts.boutique,
        toneClass: this.toneClassMap.secondary,
      },
      {
        key: 'client',
        label: 'Clients',
        value: counts.client,
        toneClass: this.toneClassMap.success,
      },
      {
        key: 'total',
        label: 'Total',
        value: counts.total,
        toneClass: this.toneClassMap.primary,
      },
    ];
  }

  private formatAmount(amount: number, currency?: string | null): string {
    const resolvedCurrency = currency || this.dashboard?.display?.currency || 'MGA';
    return `${this.numberFormatter.format(amount)} ${resolvedCurrency}`;
  }

  private toPercentNumber(rate: number): number {
    if (!rate || Number.isNaN(rate)) {
      return 0;
    }
    return Math.round(rate * 100);
  }

  private toPercentLabel(rate: number): string {
    return `${this.toPercentNumber(rate)}%`;
  }

  private toStartDateIso(value: string): string {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    return date.toISOString();
  }

  private toEndDateIso(value: string): string {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return date.toISOString();
  }
}
