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
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  expand,
  finalize,
  map,
  merge,
  of,
  reduce,
  shareReplay,
  startWith,
  Subject,
  Subscription,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { BoxService } from 'src/app/services/box.service';
import { AdminBoutique, AdminService } from 'src/app/services/admin.service';
import {
  PayementBoxEntity,
  PayementBoxActionPayload,
  PayementBoxService,
} from 'src/app/services/payement-box.service';

interface PayementRow {
  id: number;
  payementId: string;
  reference: string;
  boxLabel: string;
  boutiqueLabel: string;
  periode: string;
  montant: number;
  status: PayementBoxEntity['status'];
  date?: string;
}

@Component({
  selector: 'app-box-payement-admin-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatTableModule, MatPaginatorModule],
  templateUrl: './box-payement-admin-list.component.html',
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

      .row-clickable {
        cursor: pointer;
      }

      .row-clickable:hover {
        background: #f8fafc;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBoxPayementAdminListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = [
    'reference',
    'box',
    'boutique',
    'periode',
    'montant',
    'statut',
    'date',
  ];
  dataSource: PayementRow[] = [];
  rawItems: PayementBoxEntity[] = [];
  isLoading = false;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;

  private boxNumeroMap = new Map<string, string>();
  private boutiqueNameMap = new Map<string, string>();

  statusControl = new FormControl<'all' | 'en_attente' | 'valide' | 'rejete'>('all', {
    nonNullable: true,
  });
  boxIdControl = new FormControl('', { nonNullable: true });
  boutiqueIdControl = new FormControl('', { nonNullable: true });

  private readonly subscriptions = new Subscription();
  private readonly pageChange$ = new Subject<{ page: number; limit: number }>();

  constructor(
    private payementService: PayementBoxService,
    private boxService: BoxService,
    private adminService: AdminService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadBoutiques();

    const status$ = this.statusControl.valueChanges.pipe(startWith(this.statusControl.value));
    const boxId$ = this.boxIdControl.valueChanges.pipe(
      map((value) => this.normalizeText(value)),
      debounceTime(300),
      distinctUntilChanged(),
      startWith(this.normalizeText(this.boxIdControl.value)),
    );
    const boutiqueId$ = this.boutiqueIdControl.valueChanges.pipe(
      map((value) => this.normalizeText(value)),
      debounceTime(300),
      distinctUntilChanged(),
      startWith(this.normalizeText(this.boutiqueIdControl.value)),
    );

    const filters$ = combineLatest([status$, boxId$, boutiqueId$]).pipe(
      map(([status, boxId, boutiqueId]) => ({ status, boxId, boutiqueId })),
      distinctUntilChanged(
        (prev, curr) =>
          prev.status === curr.status &&
          prev.boxId === curr.boxId &&
          prev.boutiqueId === curr.boutiqueId,
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
        this.payementService
          .listPayements({
            page: query.page,
            limit: query.limit,
            status: query.status === 'all' ? undefined : query.status,
            boxId: query.boxId.length ? query.boxId : undefined,
            boutiqueId: query.boutiqueId.length ? query.boutiqueId : undefined,
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
        this.resolveBoxNumeros(items);
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

  openDetails(row: PayementRow): void {
    const dialogRef = this.dialog.open(BoxPayementDetailDialogComponent, {
      width: '720px',
      maxWidth: '98vw',
      data: { payementId: row.payementId },
    });
    this.subscriptions.add(
      dialogRef.afterClosed().subscribe((shouldRefresh) => {
        if (shouldRefresh) {
          this.pageChange$.next({ page: this.page, limit: this.limit });
        }
      }),
    );
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
    const boutiqueId = this.extractId(item.boutiqueId);

    return {
      id: index + 1,
      payementId: item._id,
      reference: item.reference,
      boxLabel: this.resolveBoxLabel(item.boxId, boxId),
      boutiqueLabel: this.resolveBoutiqueLabel(item.boutiqueId, boutiqueId),
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

  private resolveBoutiqueLabel(value: PayementBoxEntity['boutiqueId'], fallbackId: string): string {
    if (!value) {
      return '-';
    }
    if (typeof value === 'object') {
      const label = value.nom ?? value._id ?? fallbackId;
      return label ? label : '-';
    }
    return this.getBoutiqueLabel(value);
  }

  private extractId(value: PayementBoxEntity['boxId'] | PayementBoxEntity['boutiqueId']): string {
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

  private getBoutiqueLabel(boutiqueId: string): string {
    if (!boutiqueId) {
      return '-';
    }
    return this.boutiqueNameMap.get(boutiqueId) ?? boutiqueId;
  }

  private resolveBoxNumeros(items: PayementBoxEntity[]): void {
    const missingIds = Array.from(
      new Set(items.map((item) => this.extractId(item.boxId)).filter(Boolean)),
    ).filter((id) => !this.boxNumeroMap.has(id));

    if (!missingIds.length) {
      return;
    }

    const requests = missingIds.map((id) =>
      this.boxService.getBoxById(id).pipe(
        map((response) => ({
          id,
          numero: response?.data?.numero ?? id,
        })),
        catchError(() => of({ id, numero: id })),
      ),
    );

    merge(...requests).subscribe((result) => {
      this.boxNumeroMap.set(result.id, result.numero);
      this.refreshRows();
    });
  }

  private loadBoutiques(): void {
    this.adminService
      .getBoutiques({ page: 1, limit: 100 })
      .pipe(
        expand((response) => {
          const page = response?.data?.page ?? 1;
          const totalPages = response?.data?.totalPages ?? 1;
          if (page >= totalPages) {
            return EMPTY;
          }
          return this.adminService.getBoutiques({ page: page + 1, limit: 100 });
        }),
        map((response) => response?.data?.items ?? []),
        reduce((acc: AdminBoutique[], items) => acc.concat(items), [] as AdminBoutique[]),
        catchError(() => of([] as AdminBoutique[])),
      )
      .subscribe((items) => {
        items.forEach((item) => {
          if (item?._id) {
            this.boutiqueNameMap.set(item._id, item.nom ?? item._id);
          }
        });
        this.refreshRows();
      });
  }

  private refreshRows(): void {
    this.dataSource = this.rawItems.map((item, index) => this.mapPayement(item, index));
    this.cdr.markForCheck();
  }

  private normalizeText(value: string): string {
    return value.trim();
  }
}

@Component({
  selector: 'app-box-payement-detail-dialog',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <div mat-dialog-title class="dialog-title">Detail du paiement</div>
    <div mat-dialog-content>
      @if (isLoading) {
        <div class="p-16">Chargement en cours...</div>
      } @else if (errorMessage) {
        <div class="p-16 text-error">{{ errorMessage }}</div>
      } @else if (payement) {
        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Reference</div>
            <div class="meta-value">{{ payement.reference }}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Box</div>
            <div class="meta-value">{{ getBoxLabel(payement.boxId) }}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Boutique</div>
            <div class="meta-value">{{ getBoutiqueLabel(payement.boutiqueId) }}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Periode</div>
            <div class="meta-value">{{ payement.periode }}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Montant</div>
            <div class="meta-value">{{ formatMontant(payement.montant) }}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Statut</div>
            <div class="meta-value">{{ getStatusLabel(payement.status) }}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Date</div>
            <div class="meta-value">{{ formatDate(payement.date || payement.createdAt) }}</div>
          </div>
          @if (payement.commentaire) {
            <div class="meta-item">
              <div class="meta-label">Commentaire</div>
              <div class="meta-value">{{ payement.commentaire }}</div>
            </div>
          }
        </div>
        @if (payement.status === 'en_attente') {
          <div class="m-t-16">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Commentaire</mat-label>
              <textarea matInput rows="3" [formControl]="commentaireControl"></textarea>
              @if (commentaireControl.hasError('required')) {
                <mat-error>Commentaire requis.</mat-error>
              }
            </mat-form-field>
          </div>
        }
      }
    </div>
    <div mat-dialog-actions align="end">
      @if (payement?.status === 'en_attente') {
        <button
          mat-stroked-button
          color="warn"
          type="button"
          (click)="submitAction('reject')"
          [disabled]="isSubmitting || commentaireControl.invalid"
        >
          Rejeter
        </button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="submitAction('validate')"
          [disabled]="isSubmitting || commentaireControl.invalid"
        >
          Valider
        </button>
      }
      <button mat-button (click)="onClose()">Fermer</button>
    </div>
  `,
  styles: [
    `
      .dialog-title {
        font-weight: 600;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
    `,
  ],
})
export class BoxPayementDetailDialogComponent implements OnInit {
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  payement: PayementBoxEntity | null = null;
  commentaireControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  constructor(
    private dialogRef: MatDialogRef<BoxPayementDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { payementId: string },
    private payementService: PayementBoxService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    if (!this.data?.payementId) {
      this.errorMessage = 'Paiement introuvable.';
      return;
    }
    this.isLoading = true;
    this.payementService
      .getPayementById(this.data.payementId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.payement = response?.data ?? null;
          if (!this.payement) {
            this.errorMessage = 'Paiement introuvable.';
          }
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger le paiement.';
        },
      });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  submitAction(action: 'validate' | 'reject'): void {
    if (this.commentaireControl.invalid || !this.payement) {
      this.commentaireControl.markAsTouched();
      return;
    }

    const payload: PayementBoxActionPayload = {
      commentaire: this.commentaireControl.value.trim(),
    };

    this.isSubmitting = true;
    const request$ =
      action === 'validate'
        ? this.payementService.validatePayement(this.payement._id, payload)
        : this.payementService.rejectPayement(this.payement._id, payload);

    request$
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.payement = response?.data ?? this.payement;
          const message =
            response?.message ?? (action === 'validate' ? 'Paiement valide.' : 'Paiement rejete.');
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          const message =
            error?.error?.message ??
            (action === 'validate' ? 'Validation impossible.' : 'Rejet impossible.');
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
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

  formatMontant(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
    return `${formatted} Ar`;
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

  getBoxLabel(value: PayementBoxEntity['boxId']): string {
    if (!value) {
      return '-';
    }
    if (typeof value === 'object') {
      const label = value.numero ?? value._id;
      return label ? label : '-';
    }
    return value;
  }

  getBoutiqueLabel(value: PayementBoxEntity['boutiqueId']): string {
    if (!value) {
      return '-';
    }
    if (typeof value === 'object') {
      const label = value.nom ?? value._id;
      return label ? label : '-';
    }
    return value;
  }
}
