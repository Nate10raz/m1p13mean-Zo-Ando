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
import {
  BoutiqueDashboardGranularity,
  BoutiqueDashboardService,
  BoutiqueDashboardVentes,
  BoutiqueDashboardVentesQuery,
} from 'src/app/services/boutique-dashboard.service';
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

interface TrendRow {
  key: string;
  label: string;
  revenueFormatted: string;
  ordersCount: number;
  share: number;
}

interface TopItemRow {
  key: string;
  label: string;
  quantity: number;
  revenueFormatted: string;
  share: number;
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
  isBoutique = false;
  isLoading = false;
  errorMessage = '';
  dashboard: AdminDashboardFinance | null = null;
  lastUpdated: string | null = null;
  boutiqueDashboard: BoutiqueDashboardVentes | null = null;
  boutiqueLastUpdated: string | null = null;
  private lastAdminQueryKey: string | null = null;
  private lastBoutiqueQueryKey: string | null = null;

  filterForm = new FormGroup({
    startDate: new FormControl<string | null>(null),
    endDate: new FormControl<string | null>(null),
    topN: new FormControl<number | null>(5, {
      validators: [Validators.min(1), Validators.max(50)],
    }),
    granularity: new FormControl<BoutiqueDashboardGranularity>('week', { nonNullable: true }),
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
  boutiqueKpiCards: KpiCard[] = [];
  orderStatusRows: StatRow[] = [];
  orderStatusTotal = 0;
  trendRows: TrendRow[] = [];
  topProductRows: TopItemRow[] = [];
  topCategoryRows: TopItemRow[] = [];
  cartStatusRows: StatRow[] = [];
  cartTotal = 0;
  cartConversionPercent = 0;
  rentPaymentRows: PaymentRow[] = [];
  granularityLabel = 'Semaine';

  collectionRatePercent = 0;
  paymentRatePercent = 0;
  occupancyRatePercent = 0;
  satisfactionNote = 0;
  avgDecisionDays = 0;
  minDecisionDays = 0;
  maxDecisionDays = 0;
  boutiqueNote = 0;

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
    private boutiqueDashboardService: BoutiqueDashboardService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const role = this.authService.getCurrentRole();
    this.isAdmin = role === 'admin';
    this.isBoutique = role === 'boutique';
    if (this.isAdmin) {
      this.loadAdminDashboard();
    }
    if (this.isBoutique) {
      this.loadBoutiqueDashboard();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  applyFilters(): void {
    if (!this.isAdmin && !this.isBoutique) {
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
    if (this.isAdmin) {
      this.loadAdminDashboard();
    } else if (this.isBoutique) {
      this.loadBoutiqueDashboard();
    }
  }

  resetFilters(): void {
    this.filterForm.reset({
      startDate: null,
      endDate: null,
      topN: 5,
      granularity: 'week',
    });
    this.applyFilters();
  }

  refreshDashboard(): void {
    if (this.isAdmin) {
      this.loadAdminDashboard(true);
    } else if (this.isBoutique) {
      this.loadBoutiqueDashboard(true);
    }
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

  private loadAdminDashboard(force = false): void {
    const query = this.buildAdminQuery();
    const queryKey = this.buildQueryKey(query);
    if (!force && this.lastAdminQueryKey === queryKey) {
      return;
    }
    this.lastAdminQueryKey = queryKey;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const sub = this.adminService.getDashboardFinance(query).subscribe({
      next: (response) => {
        this.dashboard = response?.data ?? null;
        this.lastUpdated = response?.date ?? null;
        if (this.dashboard) {
          this.mapAdminDashboard(this.dashboard);
        } else {
          this.resetAdminDerived();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message ?? 'Impossible de charger le dashboard.';
        this.dashboard = null;
        this.resetAdminDerived();
        this.cdr.markForCheck();
      },
    });

    this.subscriptions.add(sub);
  }

  private mapAdminDashboard(data: AdminDashboardFinance): void {
    this.collectionRatePercent = this.toPercentNumber(
      data.location.revenueExpected > 0
        ? data.location.revenueCollected / data.location.revenueExpected
        : 0,
    );
    this.paymentRatePercent = this.toPercentNumber(data.location.paymentRate);
    this.occupancyRatePercent = this.toPercentNumber(data.occupancy.occupancyRate);
    this.satisfactionNote = data.display?.satisfactionNote ?? data.satisfaction?.noteMoyenne ?? 0;
    this.avgDecisionDays = data.display?.avgDecisionDays ?? data.demandesLocation.avgDecisionDays;
    this.minDecisionDays = data.demandesLocation.minDecisionDays;
    this.maxDecisionDays = data.demandesLocation.maxDecisionDays;

    this.paymentRows = this.buildPaymentRows(data);
    this.revenueByZone = this.buildBreakdown(data.location.revenueByZone, (item) => item.zone);
    this.revenueByEtage = this.buildBreakdown(
      data.location.revenueByEtage,
      (item) => `Etage ${item.etage}`,
    );
    this.revenueByType = this.buildBreakdown(data.location.revenueByType, (item) => item.typeNom);
    this.revenueByBoutique = this.buildBreakdown(
      data.location.revenueByBoutique,
      (item) => item.boutiqueNom,
    );
    this.demandeStatusRows = this.buildDemandeStatusRows(data);
    this.boutiqueStatusRows = this.buildBoutiqueStatusRows(data);
    this.userRoleRows = this.buildUserRoleRows(data);
    this.kpiCards = this.buildKpiCards(data);
  }

  private resetAdminDerived(): void {
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
    const occupancyRate =
      display?.occupancyRate ?? this.toPercentLabel(data.occupancy.occupancyRate);

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

  private loadBoutiqueDashboard(force = false): void {
    const query = this.buildBoutiqueQuery();
    const queryKey = this.buildQueryKey(query);
    if (!force && this.lastBoutiqueQueryKey === queryKey) {
      return;
    }
    this.lastBoutiqueQueryKey = queryKey;

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const sub = this.boutiqueDashboardService.getDashboardVentes(query).subscribe({
      next: (response) => {
        this.boutiqueDashboard = response?.data ?? null;
        this.boutiqueLastUpdated = response?.date ?? null;
        if (this.boutiqueDashboard) {
          this.mapBoutiqueDashboard(this.boutiqueDashboard);
        } else {
          this.resetBoutiqueDerived();
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message ?? 'Impossible de charger le dashboard.';
        this.boutiqueDashboard = null;
        this.resetBoutiqueDerived();
        this.cdr.markForCheck();
      },
    });

    this.subscriptions.add(sub);
  }

  private mapBoutiqueDashboard(data: BoutiqueDashboardVentes): void {
    this.boutiqueKpiCards = this.buildBoutiqueKpiCards(data);
    this.orderStatusRows = this.buildOrderStatusRows(data);
    this.orderStatusTotal = this.orderStatusRows.reduce((sum, row) => sum + row.value, 0);
    this.trendRows = this.buildTrendRows(data);
    this.topProductRows = this.buildTopProductRows(data);
    this.topCategoryRows = this.buildTopCategoryRows(data);
    this.cartStatusRows = this.buildCartStatusRows(data);
    this.cartTotal = data.carts.total;
    this.cartConversionPercent = this.toPercentNumber(data.carts.conversionRate);
    this.rentPaymentRows = this.buildRentPaymentRows(data);
    this.boutiqueNote = data.display?.noteMoyenne ?? data.customers.noteMoyenne ?? 0;
    this.granularityLabel = this.resolveGranularityLabel(
      this.filterForm.controls.granularity.value,
    );
  }

  private resetBoutiqueDerived(): void {
    this.boutiqueKpiCards = [];
    this.orderStatusRows = [];
    this.orderStatusTotal = 0;
    this.trendRows = [];
    this.topProductRows = [];
    this.topCategoryRows = [];
    this.cartStatusRows = [];
    this.cartTotal = 0;
    this.cartConversionPercent = 0;
    this.rentPaymentRows = [];
    this.boutiqueNote = 0;
  }

  private buildBoutiqueKpiCards(data: BoutiqueDashboardVentes): KpiCard[] {
    return [
      {
        key: 'revenue',
        label: "Chiffre d'affaires",
        value: data.display.revenue,
        subLabel: `${data.sales.ordersValidCount} commandes valides`,
        icon: 'cash',
        toneClass: this.toneClassMap.primary,
      },
      {
        key: 'orders',
        label: 'Commandes',
        value: String(data.sales.ordersCount),
        subLabel: `${data.sales.ordersValidCount} valides`,
        icon: 'shopping-cart',
        toneClass: this.toneClassMap.secondary,
      },
      {
        key: 'aov',
        label: 'Panier moyen',
        value: data.display.aov,
        subLabel: `${data.sales.ordersCount} commandes`,
        icon: 'receipt',
        toneClass: this.toneClassMap.primary,
      },
      {
        key: 'cancel',
        label: 'Taux annulation',
        value: data.display.cancelRate,
        subLabel: `${data.sales.statusCounts.annulee} annulee(s)`,
        icon: 'ban',
        toneClass: this.toneClassMap.error,
      },
      {
        key: 'conversion',
        label: 'Conversion paniers',
        value: data.display.conversionRate,
        subLabel: `${data.carts.total} paniers`,
        icon: 'arrows-right-left',
        toneClass: this.toneClassMap.success,
      },
      {
        key: 'clients',
        label: 'Clients actifs',
        value: String(data.customers.activeCount),
        subLabel: `${data.customers.avisCount} avis`,
        icon: 'users',
        toneClass: this.toneClassMap.secondary,
      },
    ];
  }

  private buildOrderStatusRows(data: BoutiqueDashboardVentes): StatRow[] {
    const counts = data.sales.statusCounts;
    return [
      {
        key: 'en_preparation',
        label: 'En preparation',
        value: counts.en_preparation,
        toneClass: this.toneClassMap.warning,
      },
      {
        key: 'peut_etre_collecte',
        label: 'Prete a collecter',
        value: counts.peut_etre_collecte,
        toneClass: this.toneClassMap.success,
      },
      {
        key: 'en_attente_validation',
        label: 'En attente validation',
        value: counts.en_attente_validation,
        toneClass: this.toneClassMap.secondary,
      },
      {
        key: 'non_acceptee',
        label: 'Non acceptee',
        value: counts.non_acceptee,
        toneClass: this.toneClassMap.error,
      },
      {
        key: 'annulee',
        label: 'Annulee',
        value: counts.annulee,
        toneClass: this.toneClassMap.error,
      },
    ];
  }

  private buildTrendRows(data: BoutiqueDashboardVentes): TrendRow[] {
    const items = data.sales.trend ?? [];
    const maxRevenue = items.reduce((max, item) => Math.max(max, item.revenue || 0), 0);
    return items.map((item, index) => ({
      key: `${item.date}-${index}`,
      label: this.formatTrendLabel(item.date, this.filterForm.controls.granularity.value),
      revenueFormatted:
        item.revenueFormatted ?? this.formatAmount(item.revenue || 0, data.currency),
      ordersCount: item.ordersCount || 0,
      share: maxRevenue ? (item.revenue || 0) / maxRevenue : 0,
    }));
  }

  private buildTopProductRows(data: BoutiqueDashboardVentes): TopItemRow[] {
    const items = data.sales.topProducts ?? [];
    const maxRevenue = items.reduce((max, item) => Math.max(max, item.revenue || 0), 0);
    return items.map((item, index) => ({
      key: item.produitId ?? `produit-${index}`,
      label: item.nomProduit || 'Produit',
      quantity: item.quantite || 0,
      revenueFormatted:
        item.revenueFormatted ?? this.formatAmount(item.revenue || 0, data.currency),
      share: maxRevenue ? (item.revenue || 0) / maxRevenue : 0,
    }));
  }

  private buildTopCategoryRows(data: BoutiqueDashboardVentes): TopItemRow[] {
    const items = data.sales.topCategories ?? [];
    const maxRevenue = items.reduce((max, item) => Math.max(max, item.revenue || 0), 0);
    return items.map((item, index) => ({
      key: item.categorieId ?? `categorie-${index}`,
      label: item.categorieNom || 'Categorie',
      quantity: item.quantite || 0,
      revenueFormatted:
        item.revenueFormatted ?? this.formatAmount(item.revenue || 0, data.currency),
      share: maxRevenue ? (item.revenue || 0) / maxRevenue : 0,
    }));
  }

  private buildCartStatusRows(data: BoutiqueDashboardVentes): StatRow[] {
    const counts = data.carts.byStatus;
    return [
      {
        key: 'active',
        label: 'Actifs',
        value: counts.active,
        toneClass: this.toneClassMap.primary,
      },
      {
        key: 'abandoned',
        label: 'Abandonnes',
        value: counts.abandoned,
        toneClass: this.toneClassMap.warning,
      },
      {
        key: 'converted',
        label: 'Convertis',
        value: counts.converted,
        toneClass: this.toneClassMap.success,
      },
    ];
  }

  private buildRentPaymentRows(data: BoutiqueDashboardVentes): PaymentRow[] {
    const counts = data.rent.payments.counts;
    const amounts = data.rent.payments.amounts;
    const totalCount = counts.valide + counts.en_attente + counts.rejete;
    const totalAmount = amounts.valide + amounts.en_attente + amounts.rejete;

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

  private resolveGranularityLabel(value: BoutiqueDashboardGranularity | null): string {
    if (value === 'day') {
      return 'Jour';
    }
    if (value === 'month') {
      return 'Mois';
    }
    return 'Semaine';
  }

  private formatTrendLabel(value: string, granularity: BoutiqueDashboardGranularity): string {
    if (!value) {
      return '-';
    }
    if (granularity === 'week') {
      return `Semaine ${value.split('-')[1] || value}`;
    }
    return value;
  }

  private formatAmount(amount: number, currency?: string | null): string {
    const resolvedCurrency =
      currency ||
      this.dashboard?.display?.currency ||
      this.boutiqueDashboard?.display?.currency ||
      'MGA';
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

  private buildAdminQuery(): AdminDashboardFinanceQuery {
    const { startDate, endDate, topN } = this.filterForm.getRawValue();
    return {
      startDate: startDate ? this.toStartDateIso(startDate) : undefined,
      endDate: endDate ? this.toEndDateIso(endDate) : undefined,
      topN: topN ?? undefined,
    };
  }

  private buildBoutiqueQuery(): BoutiqueDashboardVentesQuery {
    const { startDate, endDate, topN, granularity } = this.filterForm.getRawValue();
    return {
      startDate: startDate ? this.toStartDateIso(startDate) : undefined,
      endDate: endDate ? this.toEndDateIso(endDate) : undefined,
      topN: topN ?? undefined,
      granularity: granularity ?? undefined,
    };
  }

  private buildQueryKey(query: object): string {
    return JSON.stringify(query);
  }
}
