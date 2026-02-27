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
  forkJoin,
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
import {
  DemandeLocationBoxEntity,
  DemandeLocationBoxActionPayload,
  DemandeLocationBoxService,
} from 'src/app/services/demande-location-box.service';
import { BoxService } from 'src/app/services/box.service';
import { AdminBoutique, AdminService } from 'src/app/services/admin.service';

interface DemandeRow {
  id: number;
  demandeId: string;
  boxLabel: string;
  boutiqueLabel: string;
  dateDebut: string;
  status: DemandeLocationBoxEntity['status'];
  createdAt?: string;
}

@Component({
  selector: 'app-box-demand-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatTableModule, MatPaginatorModule],
  templateUrl: './box-demand-list.component.html',
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
export class AppBoxDemandListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['demande', 'box', 'boutique', 'dateDebut', 'statut', 'actions'];
  dataSource: DemandeRow[] = [];
  rawItems: DemandeLocationBoxEntity[] = [];
  isLoading = false;
  actionLoadingId: string | null = null;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;

  private boxNumeroMap = new Map<string, string>();
  private boutiqueNameMap = new Map<string, string>();

  statusControl = new FormControl<'all' | 'en_attente' | 'validee' | 'rejetee' | 'annulee'>('all', {
    nonNullable: true,
  });
  boxIdControl = new FormControl('', { nonNullable: true });
  boutiqueIdControl = new FormControl('', { nonNullable: true });
  pendingOnlyControl = new FormControl(false, { nonNullable: true });

  private readonly subscriptions = new Subscription();
  private readonly pageChange$ = new Subject<{ page: number; limit: number }>();

  constructor(
    private demandeService: DemandeLocationBoxService,
    private boxService: BoxService,
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadBoutiques();

    this.subscriptions.add(
      this.pendingOnlyControl.valueChanges
        .pipe(startWith(this.pendingOnlyControl.value))
        .subscribe((pendingOnly) => {
          if (pendingOnly) {
            this.statusControl.disable({ emitEvent: false });
            this.boxIdControl.disable({ emitEvent: false });
            this.boutiqueIdControl.disable({ emitEvent: false });
          } else {
            this.statusControl.enable({ emitEvent: false });
            this.boxIdControl.enable({ emitEvent: false });
            this.boutiqueIdControl.enable({ emitEvent: false });
          }
          this.cdr.markForCheck();
        }),
    );

    const status$ = this.statusControl.valueChanges.pipe(startWith(this.statusControl.value));
    const boxId$ = this.boxIdControl.valueChanges.pipe(
      map((value) => this.normalizeText(value)),
      debounceTime(350),
      distinctUntilChanged(),
      startWith(this.normalizeText(this.boxIdControl.value)),
    );
    const boutiqueId$ = this.boutiqueIdControl.valueChanges.pipe(
      map((value) => this.normalizeText(value)),
      debounceTime(350),
      distinctUntilChanged(),
      startWith(this.normalizeText(this.boutiqueIdControl.value)),
    );
    const pendingOnly$ = this.pendingOnlyControl.valueChanges.pipe(
      startWith(this.pendingOnlyControl.value),
    );

    const filters$ = combineLatest([status$, boxId$, boutiqueId$, pendingOnly$]).pipe(
      map(([status, boxId, boutiqueId, pendingOnly]) => ({
        status,
        boxId,
        boutiqueId,
        pendingOnly,
      })),
      distinctUntilChanged(
        (prev, curr) =>
          prev.status === curr.status &&
          prev.boxId === curr.boxId &&
          prev.boutiqueId === curr.boutiqueId &&
          prev.pendingOnly === curr.pendingOnly,
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
      switchMap((query) => {
        if (query.pendingOnly) {
          return this.demandeService.listPending({ page: query.page, limit: query.limit }).pipe(
            map((response) => ({ response, error: null as unknown })),
            catchError((error) => of({ response: null, error })),
          );
        }
        return this.demandeService
          .listDemandes({
            page: query.page,
            limit: query.limit,
            status: query.status === 'all' ? undefined : query.status,
            boxId: query.boxId.length ? query.boxId : undefined,
            boutiqueId: query.boutiqueId.length ? query.boutiqueId : undefined,
          })
          .pipe(
            map((response) => ({ response, error: null as unknown })),
            catchError((error) => of({ response: null, error })),
          );
      }),
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

  private mapDemande(item: DemandeLocationBoxEntity, index: number): DemandeRow {
    const boxId = this.extractId(item.boxId);
    const boutiqueId = this.extractId(item.boutiqueId);

    return {
      id: index + 1,
      demandeId: item._id,
      boxLabel: this.resolveBoxLabel(item.boxId, boxId),
      boutiqueLabel: this.resolveBoutiqueLabel(item.boutiqueId, boutiqueId),
      dateDebut: item.dateDebut,
      status: item.status,
      createdAt: item.createdAt,
    };
  }

  private refreshRows(): void {
    this.dataSource = this.rawItems.map((item, index) => this.mapDemande(item, index));
    this.cdr.markForCheck();
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

  private resolveBoxLabel(value: DemandeLocationBoxEntity['boxId'], fallbackId: string): string {
    if (!value) {
      return '-';
    }
    if (typeof value === 'object') {
      const label = value.numero ?? value._id ?? fallbackId;
      return label ? label : '-';
    }
    return this.getBoxLabel(value);
  }

  private resolveBoutiqueLabel(
    value: DemandeLocationBoxEntity['boutiqueId'],
    fallbackId: string,
  ): string {
    if (!value) {
      return '-';
    }
    if (typeof value === 'object') {
      const label = value.nom ?? value._id ?? fallbackId;
      return label ? label : '-';
    }
    return this.getBoutiqueLabel(value);
  }

  private extractId(
    value: DemandeLocationBoxEntity['boxId'] | DemandeLocationBoxEntity['boutiqueId'],
  ): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'object') {
      return value._id ?? '';
    }
    return value;
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

    forkJoin(requests).subscribe((results) => {
      results.forEach((result) => {
        this.boxNumeroMap.set(result.id, result.numero);
      });
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

  private normalizeText(value: string): string {
    return value.trim();
  }

  openActionDialog(action: 'approve' | 'reject', row: DemandeRow): void {
    if (row.status !== 'en_attente') {
      return;
    }

    const dialogRef = this.dialog.open(BoxDemandActionDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: {
        action,
        demande: row,
        dateDebutLabel: this.formatDate(row.dateDebut),
      },
    });

    this.subscriptions.add(
      dialogRef.afterClosed().subscribe((result) => {
        const commentaire = result?.commentaire as string | undefined;
        if (!commentaire) {
          return;
        }
        this.submitAction(action, row.demandeId, commentaire);
      }),
    );
  }

  private submitAction(action: 'approve' | 'reject', demandeId: string, commentaire: string): void {
    this.actionLoadingId = demandeId;
    this.cdr.markForCheck();

    const payload: DemandeLocationBoxActionPayload = { commentaire };
    const request$ =
      action === 'approve'
        ? this.demandeService.approveDemande(demandeId, payload)
        : this.demandeService.rejectDemande(demandeId, payload);

    this.subscriptions.add(
      request$
        .pipe(
          finalize(() => {
            this.actionLoadingId = null;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (response) => {
            const updated = response?.data ?? null;
            this.applyActionUpdate(action, demandeId, updated);
            const message =
              response?.message ?? (action === 'approve' ? 'Demande validee.' : 'Demande rejetee.');
            this.snackBar.open(message, 'Fermer', { duration: 4000 });
            this.refreshList();
          },
          error: (error) => {
            const message =
              error?.error?.message ??
              (action === 'approve' ? 'Validation impossible.' : 'Rejet impossible.');
            this.snackBar.open(message, 'Fermer', { duration: 4000 });
          },
        }),
    );
  }

  private applyActionUpdate(
    action: 'approve' | 'reject',
    demandeId: string,
    updated: DemandeLocationBoxEntity | null,
  ): void {
    const nextStatus = updated?.status ?? (action === 'approve' ? 'validee' : 'rejetee');
    const index = this.rawItems.findIndex((item) => item._id === demandeId);
    if (index === -1) {
      return;
    }

    if (this.pendingOnlyControl.value && nextStatus !== 'en_attente') {
      this.rawItems.splice(index, 1);
      this.total = Math.max(0, this.total - 1);
      this.refreshRows();
      return;
    }

    this.rawItems[index] = updated ?? { ...this.rawItems[index], status: nextStatus };
    this.refreshRows();
  }

  private refreshList(): void {
    this.pageChange$.next({ page: this.page, limit: this.limit });
  }
}

@Component({
  selector: 'app-box-demand-action-dialog',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <div mat-dialog-title class="dialog-title">
      {{ data.action === 'approve' ? 'Valider la demande' : 'Rejeter la demande' }}
    </div>
    <div mat-dialog-content>
      <div class="text-muted m-b-12">
        Box {{ data.demande.boxLabel }} · Boutique {{ data.demande.boutiqueLabel }}
      </div>
      <div class="text-muted m-b-16">Date debut : {{ data.dateDebutLabel }}</div>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Commentaire</mat-label>
        <textarea matInput rows="3" [formControl]="commentaireControl"></textarea>
        @if (commentaireControl.hasError('required')) {
          <mat-error>Commentaire requis.</mat-error>
        }
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="onClose()">Annuler</button>
      <button
        mat-flat-button
        [color]="data.action === 'approve' ? 'primary' : 'warn'"
        type="button"
        (click)="submit()"
        [disabled]="commentaireControl.invalid"
      >
        {{ data.action === 'approve' ? 'Valider' : 'Rejeter' }}
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
export class BoxDemandActionDialogComponent {
  commentaireControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  constructor(
    private dialogRef: MatDialogRef<BoxDemandActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      action: 'approve' | 'reject';
      demande: DemandeRow;
      dateDebutLabel: string;
    },
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.commentaireControl.invalid) {
      this.commentaireControl.markAsTouched();
      return;
    }
    this.dialogRef.close({ commentaire: this.commentaireControl.value.trim() });
  }
}
