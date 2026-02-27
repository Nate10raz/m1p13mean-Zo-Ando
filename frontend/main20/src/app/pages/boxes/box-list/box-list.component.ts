import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { BoxTypeEntity, BoxTypeService } from 'src/app/services/box-type.service';

interface BoxRow {
  id: number;
  boxId: string;
  numero: string;
  zone: string;
  etage: number;
  superficie: number;
  typeLabel: string;
  tarifLabel: string;
  estOccupe: boolean;
}

@Component({
  selector: 'app-box-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './box-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBoxListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['box', 'type', 'superficie', 'tarif', 'statut', 'actions'];
  dataSource: BoxRow[] = [];
  isLoading = false;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;

  boxTypes: BoxTypeEntity[] = [];
  isLoadingTypes = false;

  searchControl = new FormControl('', { nonNullable: true });
  zoneControl = new FormControl('', { nonNullable: true });
  etageControl = new FormControl<number | null>(null);
  typeControl = new FormControl<string>('all', { nonNullable: true });
  statusControl = new FormControl<'all' | 'occupied' | 'free'>('all', { nonNullable: true });

  private readonly subscriptions = new Subscription();
  private readonly pageChange$ = new Subject<{ page: number; limit: number }>();

  constructor(
    private boxService: BoxService,
    private boxTypeService: BoxTypeService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadBoxTypes();

    const search$ = this.searchControl.valueChanges.pipe(
      map((value) => this.normalizeSearch(value)),
      debounceTime(350),
      distinctUntilChanged(),
      startWith(this.normalizeSearch(this.searchControl.value)),
    );

    const zone$ = this.zoneControl.valueChanges.pipe(
      map((value) => this.normalizeText(value)),
      debounceTime(350),
      distinctUntilChanged(),
      startWith(this.normalizeText(this.zoneControl.value)),
    );

    const etage$ = this.etageControl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      startWith(this.etageControl.value),
    );

    const type$ = this.typeControl.valueChanges.pipe(startWith(this.typeControl.value));
    const status$ = this.statusControl.valueChanges.pipe(startWith(this.statusControl.value));

    const filters$ = combineLatest([search$, zone$, etage$, type$, status$]).pipe(
      map(([search, zone, etage, typeId, status]) => ({ search, zone, etage, typeId, status })),
      distinctUntilChanged(
        (prev, curr) =>
          prev.search === curr.search &&
          prev.zone === curr.zone &&
          prev.etage === curr.etage &&
          prev.typeId === curr.typeId &&
          prev.status === curr.status,
      ),
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
        this.boxService
          .listBoxes({
            page: query.page,
            limit: query.limit,
            search: query.search.length ? query.search : undefined,
            zone: query.zone.length ? query.zone : undefined,
            etage: this.parseEtage(query.etage),
            typeId: query.typeId === 'all' ? undefined : query.typeId,
            estOccupe:
              query.status === 'all' ? undefined : query.status === 'occupied' ? true : false,
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
          this.errorMessage = error?.error?.message ?? 'Impossible de charger les boxes.';
          this.dataSource = [];
          this.total = 0;
          this.cdr.markForCheck();
          return;
        }

        const items = response?.data?.items ?? [];
        this.total = response?.data?.total ?? items.length;
        this.dataSource = items.map((item, index) => this.mapBox(item, index));
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

  trackByBoxId(index: number, row: BoxRow): string {
    return row.boxId || String(index);
  }

  formatSurface(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
    return `${formatted} m2`;
  }

  formatTarif(value: BoxEntity['tarifActuel']): string {
    if (!value?.montant) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
      value.montant,
    );
    const unite = value.unite === 'annee' ? 'annee' : 'mois';
    return `${formatted} Ar / ${unite}`;
  }

  private loadBoxTypes(): void {
    this.isLoadingTypes = true;
    this.boxTypeService
      .listBoxTypes({ page: 1, limit: 200 })
      .pipe(
        map((response) => response?.data?.items ?? []),
        catchError(() => of([])),
      )
      .subscribe({
        next: (items) => {
          this.boxTypes = items.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
          this.isLoadingTypes = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.boxTypes = [];
          this.isLoadingTypes = false;
          this.cdr.markForCheck();
        },
      });
  }

  private mapBox(item: BoxEntity, index: number): BoxRow {
    const typeLabel =
      typeof item.typeId === 'object'
        ? (item.typeId?.nom ?? item.typeId?._id ?? '-')
        : (item.typeId ?? '-');

    return {
      id: index + 1,
      boxId: item._id,
      numero: item.numero,
      zone: item.zone,
      etage: item.etage,
      superficie: item.superficie,
      typeLabel,
      tarifLabel: this.formatTarif(item.tarifActuel),
      estOccupe: Boolean(item.estOccupe),
    };
  }

  private normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  private normalizeText(value: string): string {
    return value.trim();
  }

  private parseEtage(value: number | null | undefined): number | undefined {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return undefined;
    }
    return Number(value);
  }
}
