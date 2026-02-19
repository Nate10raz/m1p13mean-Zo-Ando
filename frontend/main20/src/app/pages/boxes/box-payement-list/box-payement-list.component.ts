import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  of,
  shareReplay,
  startWith,
  Subject,
  Subscription,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { BoxEntity, BoxService } from 'src/app/services/box.service';
import {
  PayementBoxEntity,
  PayementBoxService,
} from 'src/app/services/payement-box.service';

interface PayementRow {
  id: number;
  payementId: string;
  reference: string;
  boxLabel: string;
  periode: string;
  montant: number;
  status: PayementBoxEntity['status'];
  date?: string;
}

interface BoxOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-box-payement-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatTableModule, MatPaginatorModule],
  templateUrl: './box-payement-list.component.html',
  styles: [
    `
      .status-pill {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-pill.pending {
        background: #fff8e1;
        color: #8d6e63;
      }

      .status-pill.validated {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .status-pill.rejected {
        background: #ffebee;
        color: #c62828;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBoxPayementListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['reference', 'box', 'periode', 'montant', 'statut', 'date'];
  dataSource: PayementRow[] = [];
  rawItems: PayementBoxEntity[] = [];
  isLoading = false;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;

  boxOptions: BoxOption[] = [];
  isLoadingBoxes = false;
  private boxNumeroMap = new Map<string, string>();

  statusControl = new FormControl<'all' | 'en_attente' | 'valide' | 'rejete'>('all', {
    nonNullable: true,
  });
  boxControl = new FormControl<string>('all', { nonNullable: true });

  private readonly subscriptions = new Subscription();
  private readonly pageChange$ = new Subject<{ page: number; limit: number }>();

  constructor(
    private payementService: PayementBoxService,
    private boxService: BoxService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadBoxes();

    const status$ = this.statusControl.valueChanges.pipe(startWith(this.statusControl.value));
    const box$ = this.boxControl.valueChanges.pipe(
      map((value) => this.normalizeText(value)),
      debounceTime(200),
      distinctUntilChanged(),
      startWith(this.normalizeText(this.boxControl.value)),
    );

    const filters$ = combineLatest([status$, box$]).pipe(
      map(([status, boxId]) => ({ status, boxId })),
      distinctUntilChanged((prev, curr) => prev.status === curr.status && prev.boxId === curr.boxId),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    const filterRequests$ = filters$.pipe(
      tap(() => {
        this.page = 1;
      }),
      map((filters) => ({ ...filters, page: 1, limit: this.limit })),
    );

    const pageRequests$ = this.pageChange$.pipe(
      withLatestFrom(filters$),
      map(([pageState, filters]) => ({ ...filters, ...pageState })),
    );

    const requests$ = merge(filterRequests$, pageRequests$).pipe(
      tap(() => {
        this.isLoading = true;
        this.errorMessage = '';
        this.cdr.markForCheck();
      }),
      switchMap((query) =>
        this.payementService
          .listPayements({
            page: query.page,
            limit: query.limit,
            status: query.status === 'all' ? undefined : query.status,
            boxId: query.boxId === 'all' ? undefined : query.boxId,
          })
          .pipe(
            map((response) => ({ response, error: null as unknown })),
            catchError((error) => of({ response: null, error })),
          ),
      ),
    );

    this.subscriptions.add(
      requests$.subscribe(({ response, error }) => {
        this.isLoading = false;

        if (!response || error) {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger les paiements.';
          this.dataSource = [];
          this.total = 0;
          this.cdr.markForCheck();
          return;
        }

        const items = response?.data?.items ?? [];
        this.total = response?.data?.total ?? items.length;
        this.rawItems = items;
        this.dataSource = items.map((item, index) => this.mapPayement(item, index));
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.pageChange$.next({ page: this.page, limit: this.limit });
  }

  trackByPayementId(index: number, row: PayementRow): string {
    return row.payementId || String(index);
  }

  getStatusLabel(status: PayementBoxEntity['status']): string {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'valide':
        return 'Valide';
      case 'rejete':
        return 'Rejete';
      default:
        return status;
    }
  }

  getStatusClass(status: PayementBoxEntity['status']): string {
    switch (status) {
      case 'en_attente':
        return 'pending';
      case 'valide':
        return 'validated';
      case 'rejete':
        return 'rejected';
      default:
        return '';
    }
  }

  formatDate(value: string | undefined | null): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }

  formatMontant(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
    return `${formatted} Ar`;
  }

  private mapPayement(item: PayementBoxEntity, index: number): PayementRow {
    const boxId = this.extractId(item.boxId);

    return {
      id: index + 1,
      payementId: item._id,
      reference: item.reference,
      boxLabel: this.resolveBoxLabel(item.boxId, boxId),
      periode: item.periode,
      montant: item.montant,
      status: item.status,
      date: item.date ?? item.createdAt,
    };
  }

  private resolveBoxLabel(value: PayementBoxEntity['boxId'], fallbackId: string): string {
    if (!value) {
      return '-';
    }
    if (typeof value === 'object') {
      const label = value.numero ?? value._id ?? fallbackId;
      return label ? label : '-';
    }
    return this.getBoxLabel(value);
  }

  private extractId(value: PayementBoxEntity['boxId']): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'object') {
      return value._id ?? '';
    }
    return value;
  }

  private getBoxLabel(boxId: string): string {
    if (!boxId) {
      return '-';
    }
    return this.boxNumeroMap.get(boxId) ?? boxId;
  }

  private loadBoxes(): void {
    this.isLoadingBoxes = true;
    this.boxService
      .listMyBoxes({ page: 1, limit: 200 })
      .pipe(
        map((response) => response?.data?.items ?? []),
        catchError(() => of([] as BoxEntity[])),
      )
      .subscribe({
        next: (items) => {
          this.boxOptions = items.map((item) => ({
            id: item._id,
            label: `${item.numero} · Zone ${item.zone} · Etage ${item.etage}`,
          }));
          this.boxNumeroMap = new Map(items.map((item) => [item._id, item.numero]));
          this.isLoadingBoxes = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.boxOptions = [];
          this.boxNumeroMap = new Map();
          this.isLoadingBoxes = false;
          this.cdr.markForCheck();
        },
      });
  }

  private normalizeText(value: string): string {
    return value.trim();
  }
}
