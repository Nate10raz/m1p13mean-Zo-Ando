import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  finalize,
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
import { DemandeLocationBoxService } from 'src/app/services/demande-location-box.service';

interface BoxRow {
  id: number;
  boxId: string;
  numero: string;
  zone: string;
  etage: number;
  superficie: number;
  typeLabel: string;
  tarifLabel: string;
  raw: BoxEntity;
}

@Component({
  selector: 'app-box-available',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatTableModule, MatPaginatorModule],
  templateUrl: './box-available.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBoxAvailableComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['box', 'type', 'superficie', 'tarif', 'actions'];
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

  private readonly subscriptions = new Subscription();
  private readonly pageChange$ = new Subject<{ page: number; limit: number }>();

  constructor(
    private boxService: BoxService,
    private boxTypeService: BoxTypeService,
    private dialog: MatDialog,
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

    const filters$ = combineLatest([search$, zone$, etage$, type$]).pipe(
      map(([search, zone, etage, typeId]) => ({ search, zone, etage, typeId })),
      distinctUntilChanged(
        (prev, curr) =>
          prev.search === curr.search &&
          prev.zone === curr.zone &&
          prev.etage === curr.etage &&
          prev.typeId === curr.typeId,
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
          .listAvailableBoxes({
            page: query.page,
            limit: query.limit,
            search: query.search.length ? query.search : undefined,
            zone: query.zone.length ? query.zone : undefined,
            etage: this.parseEtage(query.etage),
            typeId: query.typeId === 'all' ? undefined : query.typeId,
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
          this.errorMessage =
            error?.error?.message ?? 'Impossible de charger les boxes disponibles.';
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

  openDetails(row: BoxRow): void {
    this.dialog.open(BoxAvailableDetailDialogComponent, {
      width: '900px',
      maxWidth: '98vw',
      data: row.raw,
    });
  }

  openRentRequest(row: BoxRow): void {
    this.dialog.open(BoxRentRequestDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: { box: row.raw },
    });
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
      raw: item,
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

@Component({
  selector: 'app-box-available-detail-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <div mat-dialog-title class="dialog-title">
      <div>
        <div class="title">{{ data.numero }}</div>
        <div class="subtitle">Zone {{ data.zone }} · Etage {{ data.etage }}</div>
      </div>
      <span class="status-pill" [class.free]="!data.estOccupe" [class.occupied]="data.estOccupe">
        {{ data.estOccupe ? 'Occupee' : 'Disponible' }}
      </span>
    </div>

    <div mat-dialog-content>
      <div class="box-grid">
        <div>
          <div class="image-frame">
            @if (activeImageUrl) {
              <img [src]="activeImageUrl" [alt]="data.numero" />
            } @else {
              <span class="text-muted">Aucune photo</span>
            }
          </div>
          @if (data.photos?.length) {
            <div class="thumb-list">
              @for (photo of data.photos; track photo) {
                <button
                  type="button"
                  class="thumb"
                  [class.active]="activeImageUrl === photo"
                  (click)="selectImage(photo)"
                  aria-label="Voir photo"
                >
                  <img [src]="photo" [alt]="data.numero" />
                </button>
              }
            </div>
          }
        </div>

        <div>
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Type</div>
              <div class="meta-value">{{ getTypeLabel(data) }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Superficie</div>
              <div class="meta-value">{{ formatSurface(data.superficie) }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Tarif</div>
              <div class="meta-value">{{ formatTarif(data.tarifActuel) }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Debut tarif</div>
              <div class="meta-value">{{ formatDate(data.tarifActuel?.dateDebut) }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Allee</div>
              <div class="meta-value">{{ data.allee || '-' }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Position</div>
              <div class="meta-value">{{ data.position || '-' }}</div>
            </div>
          </div>

          <div class="section-title">Description</div>
          <p class="text-muted">{{ data.description || 'Aucune description.' }}</p>

          @if (data.caracteristiques?.length) {
            <div class="section-title">Caracteristiques</div>
            <div class="attribute-list">
              @for (attr of data.caracteristiques; track attr.nom) {
                <div class="attribute-item">
                  <div class="attribute-name">{{ attr.nom }}</div>
                  <div class="attribute-values">{{ attr.valeur }}</div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="openRentRequest()">Demander loyer</button>
      <button mat-button (click)="onClose()">Fermer</button>
    </div>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .title {
        font-size: 20px;
        font-weight: 600;
      }

      .subtitle {
        color: #6b7280;
        font-size: 13px;
      }

      .status-pill {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-pill.free {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .status-pill.occupied {
        background: #ffebee;
        color: #c62828;
      }

      .box-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 20px;
      }

      @media (max-width: 900px) {
        .box-grid {
          grid-template-columns: 1fr;
        }
      }

      .image-frame {
        width: 100%;
        border-radius: 12px;
        border: 1px solid #e0e0e0;
        overflow: hidden;
        background: #fafafa;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 220px;
      }

      .image-frame img {
        width: 100%;
        height: auto;
        display: block;
        object-fit: cover;
      }

      .thumb-list {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      .thumb {
        width: 64px;
        height: 64px;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        overflow: hidden;
        cursor: pointer;
        background: #fff;
        padding: 0;
      }

      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .thumb.active {
        border-color: #42a5f5;
        box-shadow: 0 0 0 2px rgba(66, 165, 245, 0.2);
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
      }

      .meta-item {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        background: #fff;
      }

      .meta-label {
        font-size: 12px;
        text-transform: uppercase;
        color: #6b7280;
        margin-bottom: 4px;
      }

      .meta-value {
        font-weight: 600;
        color: #1f2937;
        word-break: break-word;
      }

      .text-muted {
        color: #6b7280;
      }

      .section-title {
        font-weight: 600;
        margin: 16px 0 8px;
      }

      .attribute-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .attribute-item {
        padding: 8px 10px;
        border-radius: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .attribute-name {
        font-weight: 600;
      }

      .attribute-values {
        font-size: 13px;
        color: #475569;
      }
    `,
  ],
})
export class BoxAvailableDetailDialogComponent {
  activeImageUrl = '';

  constructor(
    private dialogRef: MatDialogRef<BoxAvailableDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BoxEntity,
    private dialog: MatDialog,
  ) {
    const photos = data.photos ?? [];
    this.activeImageUrl = photos[0] ?? '';
  }

  onClose(): void {
    this.dialogRef.close();
  }

  openRentRequest(): void {
    this.dialog.open(BoxRentRequestDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: { box: this.data },
    });
  }

  selectImage(url: string): void {
    this.activeImageUrl = url;
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

  getTypeLabel(box: BoxEntity): string {
    return typeof box.typeId === 'object'
      ? (box.typeId?.nom ?? box.typeId?._id ?? '-')
      : box.typeId;
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
}

@Component({
  selector: 'app-box-rent-request-dialog',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <div mat-dialog-title class="dialog-title">Demande de location</div>
    <div mat-dialog-content>
      <div class="text-muted m-b-12">
        Box {{ data.box.numero }} · Zone {{ data.box.zone }} · Etage {{ data.box.etage }}
      </div>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Date debut</mat-label>
        <input matInput type="datetime-local" [formControl]="dateDebutControl" />
        @if (dateDebutControl.hasError('required')) {
          <mat-error>Date debut requise.</mat-error>
        }
      </mat-form-field>
      @if (serverError) {
        <div class="text-error m-t-8">{{ serverError }}</div>
      }
    </div>
    <div mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="onClose()" [disabled]="isSubmitting">
        Annuler
      </button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        (click)="submit()"
        [disabled]="isSubmitting || dateDebutControl.invalid"
      >
        {{ isSubmitting ? 'Envoi...' : 'Envoyer' }}
      </button>
    </div>
  `,
  styles: [
    `
      .dialog-title {
        font-weight: 600;
      }

      .text-muted {
        color: #6b7280;
      }
    `,
  ],
})
export class BoxRentRequestDialogComponent {
  isSubmitting = false;
  serverError = '';
  dateDebutControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  constructor(
    private dialogRef: MatDialogRef<BoxRentRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { box: BoxEntity },
    private demandeService: DemandeLocationBoxService,
    private snackBar: MatSnackBar,
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.dateDebutControl.invalid) {
      this.dateDebutControl.markAsTouched();
      return;
    }

    const dateDebut = this.toIsoDate(this.dateDebutControl.value);
    if (!dateDebut) {
      this.serverError = 'Date debut requise.';
      return;
    }

    this.isSubmitting = true;
    this.serverError = '';

    this.demandeService
      .createDemande({
        boxId: this.data.box._id,
        dateDebut,
      })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Demande envoyee.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.serverError = error?.error?.message ?? 'Demande impossible.';
        },
      });
  }

  private toIsoDate(value: string | null | undefined): string {
    const normalized = (value ?? '').toString().trim();
    if (!normalized) {
      return '';
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return normalized;
    }
    return parsed.toISOString();
  }
}
