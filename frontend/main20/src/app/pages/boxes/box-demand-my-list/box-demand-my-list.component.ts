import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
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
import {
  DemandeLocationBoxEntity,
  DemandeLocationBoxService,
} from 'src/app/services/demande-location-box.service';
import { BoxService } from 'src/app/services/box.service';

interface DemandeRow {
  id: number;
  demandeId: string;
  boxLabel: string;
  dateDebut: string;
  status: DemandeLocationBoxEntity['status'];
  createdAt?: string;
}

@Component({
  selector: 'app-box-demand-my-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatTableModule, MatPaginatorModule],
  templateUrl: './box-demand-my-list.component.html',
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

      .status-pill.cancelled {
        background: #eceff1;
        color: #455a64;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBoxDemandMyListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['demande', 'box', 'dateDebut', 'statut', 'actions'];
  dataSource: DemandeRow[] = [];
  rawItems: DemandeLocationBoxEntity[] = [];
  isLoading = false;
  actionLoadingId: string | null = null;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;

  statusControl = new FormControl<'all' | 'en_attente' | 'validee' | 'rejetee' | 'annulee'>(
    'all',
    { nonNullable: true },
  );

  private boxNumeroMap = new Map<string, string>();
  private readonly subscriptions = new Subscription();
  private readonly pageChange$ = new Subject<{ page: number; limit: number }>();

  constructor(
    private demandeService: DemandeLocationBoxService,
    private boxService: BoxService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const status$ = this.statusControl.valueChanges.pipe(startWith(this.statusControl.value));

    const filters$ = combineLatest([status$]).pipe(
      map(([status]) => ({ status })),
      distinctUntilChanged((prev, curr) => prev.status === curr.status),
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
        this.demandeService
          .listMyDemandes({
            page: query.page,
            limit: query.limit,
            status: query.status === 'all' ? undefined : query.status,
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
          this.errorMessage = error?.error?.message ?? 'Impossible de charger les demandes.';
          this.dataSource = [];
          this.total = 0;
          this.cdr.markForCheck();
          return;
        }

        const items = response?.data?.items ?? [];
        this.total = response?.data?.total ?? items.length;
        this.rawItems = items;
        this.dataSource = items.map((item, index) => this.mapDemande(item, index));
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

  trackByDemandeId(index: number, row: DemandeRow): string {
    return row.demandeId || String(index);
  }

  getStatusLabel(status: DemandeLocationBoxEntity['status']): string {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'validee':
        return 'Validee';
      case 'rejetee':
        return 'Rejetee';
      case 'annulee':
        return 'Annulee';
      default:
        return status;
    }
  }

  getStatusClass(status: DemandeLocationBoxEntity['status']): string {
    switch (status) {
      case 'en_attente':
        return 'pending';
      case 'validee':
        return 'validated';
      case 'rejetee':
        return 'rejected';
      case 'annulee':
        return 'cancelled';
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

  cancelDemande(row: DemandeRow): void {
    if (row.status !== 'en_attente') {
      return;
    }

    const dialogRef = this.dialog.open(BoxDemandCancelDialogComponent, {
      width: '380px',
      maxWidth: '95vw',
      data: {
        boxLabel: row.boxLabel,
        dateDebutLabel: this.formatDate(row.dateDebut),
      },
    });

    this.subscriptions.add(
      dialogRef.afterClosed().subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.submitCancel(row);
      }),
    );
  }

  private submitCancel(row: DemandeRow): void {
    this.actionLoadingId = row.demandeId;
    this.cdr.markForCheck();

    this.demandeService
      .cancelDemande(row.demandeId)
      .pipe(
        finalize(() => {
          this.actionLoadingId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Demande annulee.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
          this.refreshList();
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Annulation impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private mapDemande(item: DemandeLocationBoxEntity, index: number): DemandeRow {
    const boxId = this.extractId(item.boxId);

    return {
      id: index + 1,
      demandeId: item._id,
      boxLabel: this.resolveBoxLabel(item.boxId, boxId),
      dateDebut: item.dateDebut,
      status: item.status,
      createdAt: item.createdAt,
    };
  }

  private refreshRows(): void {
    this.dataSource = this.rawItems.map((item, index) => this.mapDemande(item, index));
    this.cdr.markForCheck();
  }

  private resolveBoxLabel(
    value: DemandeLocationBoxEntity['boxId'],
    fallbackId: string,
  ): string {
    if (!value) {
      return '-';
    }
    if (typeof value === 'object') {
      const label = value.numero ?? value._id ?? fallbackId;
      return label ? label : '-';
    }
    return this.getBoxLabel(value);
  }

  private extractId(value: DemandeLocationBoxEntity['boxId']): string {
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

  private resolveBoxNumeros(items: DemandeLocationBoxEntity[]): void {
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

    if (!requests.length) {
      return;
    }

    merge(...requests)
      .pipe(
        finalize(() => {
          this.refreshRows();
        }),
      )
      .subscribe((result) => {
        this.boxNumeroMap.set(result.id, result.numero);
      });
  }

  private refreshList(): void {
    this.pageChange$.next({ page: this.page, limit: this.limit });
  }
}

@Component({
  selector: 'app-box-demand-cancel-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <div mat-dialog-title class="dialog-title">Annuler la demande</div>
    <div mat-dialog-content>
      <div class="text-muted">
        Voulez-vous annuler la demande pour la box {{ data.boxLabel }} ?
      </div>
      <div class="text-muted m-t-8">Date debut : {{ data.dateDebutLabel }}</div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="onClose(false)">Non</button>
      <button mat-flat-button color="warn" type="button" (click)="onClose(true)">
        Oui, annuler
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
export class BoxDemandCancelDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<BoxDemandCancelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { boxLabel: string; dateDebutLabel: string },
  ) {}

  onClose(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
