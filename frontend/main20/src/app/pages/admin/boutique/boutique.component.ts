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
import { MaterialModule } from '../../../material.module';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
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
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  AdminBoutique,
  AdminBoutiqueStatus,
  AdminSuspendBoutiquePayload,
  AdminService,
} from 'src/app/services/admin.service';

export interface BoutiqueRow {
  id: number;
  boutiqueId: string;
  logo: string;
  nom: string;
  proprietaire: string;
  telephone: string;
  statut: 'actif' | 'en attente' | 'suspendu' | 'rejete';
  motifSuspension?: string;
}

interface SuspendBoutiqueDialogData {
  boutique: BoutiqueRow;
}

@Component({
  selector: 'app-admin-boutique',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatPaginatorModule,
  ],
  templateUrl: './boutique.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppAdminBoutiqueComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['boutique', 'contact', 'statut', 'actions'];
  dataSource: BoutiqueRow[] = [];
  isLoading = false;
  actionInProgress = false;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;

  searchControl = new FormControl('', { nonNullable: true });
  statusControl = new FormControl<'all' | AdminBoutiqueStatus>('all', { nonNullable: true });
  sortByControl = new FormControl<'createdAt' | 'nom' | 'status'>('createdAt', {
    nonNullable: true,
  });
  sortDirControl = new FormControl<'asc' | 'desc'>('desc', { nonNullable: true });
  private subscriptions = new Subscription();
  private pageChange$ = new Subject<{ page: number; limit: number }>();

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const search$ = this.searchControl.valueChanges.pipe(
      map((value) => this.normalizeSearch(value)),
      debounceTime(400),
      distinctUntilChanged(),
      startWith(this.normalizeSearch(this.searchControl.value)),
    );
    const status$ = this.statusControl.valueChanges.pipe(startWith(this.statusControl.value));
    const sortBy$ = this.sortByControl.valueChanges.pipe(startWith(this.sortByControl.value));
    const sortDir$ = this.sortDirControl.valueChanges.pipe(startWith(this.sortDirControl.value));

    const filters$ = combineLatest([search$, status$, sortBy$, sortDir$]).pipe(
      map(([search, status, sortBy, sortDir]) => ({ search, status, sortBy, sortDir })),
      distinctUntilChanged(
        (prev, curr) =>
          prev.search === curr.search &&
          prev.status === curr.status &&
          prev.sortBy === curr.sortBy &&
          prev.sortDir === curr.sortDir,
      ),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    const filterRequests$ = filters$.pipe(
      tap(() => {
        this.page = 1;
      }),
      map((filters) => ({
        ...filters,
        page: 1,
        limit: this.limit,
      })),
    );

    const pageRequests$ = this.pageChange$.pipe(
      withLatestFrom(filters$),
      map(([pageState, filters]) => ({
        ...filters,
        ...pageState,
      })),
    );

    const requests$ = merge(filterRequests$, pageRequests$).pipe(
      tap(() => {
        this.isLoading = true;
        this.errorMessage = '';
        this.cdr.markForCheck();
      }),
      switchMap((query) =>
        this.adminService
          .getBoutiques({
            page: query.page,
            limit: query.limit,
            includeUser: true,
            search: query.search.length ? query.search : undefined,
            status: query.status === 'all' ? undefined : query.status,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
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
            error?.error?.message ?? 'Impossible de charger la liste des boutiques.';
          this.dataSource = [];
          this.total = 0;
          this.cdr.markForCheck();
          return;
        }

        const items = response?.data?.items ?? [];
        this.total = response?.data?.total ?? items.length;
        this.dataSource = items.map((item, index) => this.mapBoutique(item, index));
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

  private mapBoutique(item: AdminBoutique, index: number): BoutiqueRow {
    const logoIndex = (index % 4) + 1;
    const statut = this.mapStatus(item.status, item.isActive);
    const proprietaire = this.getOwnerName(item);

    return {
      id: index + 1,
      boutiqueId: item._id,
      logo: `assets/images/products/product-${logoIndex}.png`,
      nom: item.nom,
      proprietaire,
      telephone: item.telephone,
      statut,
      motifSuspension: item.motifSuspension,
    };
  }

  trackByBoutiqueId(index: number, row: BoutiqueRow): string {
    return row.boutiqueId || String(index);
  }

  private mapStatus(
    status: AdminBoutiqueStatus | undefined,
    isActive: boolean,
  ): BoutiqueRow['statut'] {
    if (status === 'active') {
      return 'actif';
    }
    if (status === 'suspendue') {
      return 'suspendu';
    }
    if (status === 'en_attente') {
      return 'en attente';
    }
    if (status === 'rejetee') {
      return 'rejete';
    }

    return isActive ? 'actif' : 'suspendu';
  }

  private getOwnerName(item: AdminBoutique): string {
    const owner = item.user;
    if (!owner) {
      return 'Inconnu';
    }

    const fullName = [owner.prenom, owner.nom].filter(Boolean).join(' ').trim();
    return fullName || owner.email || 'Inconnu';
  }

  openSuspendDialog(boutique: BoutiqueRow): void {
    if (this.actionInProgress || boutique.statut === 'suspendu') {
      return;
    }

    const dialogRef = this.dialog.open(SuspendBoutiqueDialogComponent, {
      width: '420px',
      data: { boutique },
    });

    dialogRef.afterClosed().subscribe((motif: string | undefined) => {
      if (!motif) {
        return;
      }
      this.suspendBoutique(boutique.boutiqueId, { motif });
    });
  }

  openReactivateDialog(boutique: BoutiqueRow): void {
    if (this.actionInProgress || boutique.statut !== 'suspendu') {
      return;
    }

    const dialogRef = this.dialog.open(ReactivateBoutiqueDialogComponent, {
      width: '380px',
      data: { boutique },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.reactivateBoutique(boutique);
    });
  }

  openApproveDialog(boutique: BoutiqueRow): void {
    if (this.actionInProgress || boutique.statut !== 'en attente') {
      return;
    }

    const dialogRef = this.dialog.open(ApproveBoutiqueDialogComponent, {
      width: '380px',
      data: { boutique },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.approveBoutique(boutique);
    });
  }

  private reactivateBoutique(boutique: BoutiqueRow): void {
    if (this.actionInProgress || boutique.statut !== 'suspendu') {
      return;
    }

    this.actionInProgress = true;
    this.adminService
      .reactivateBoutique(boutique.boutiqueId)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Boutique reactivee';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.triggerReload();
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Reactivation impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private approveBoutique(boutique: BoutiqueRow): void {
    if (this.actionInProgress || boutique.statut !== 'en attente') {
      return;
    }

    this.actionInProgress = true;
    this.adminService
      .approveBoutique(boutique.boutiqueId)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Boutique approuvee';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.triggerReload();
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Approbation impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private suspendBoutique(boutiqueId: string, payload: AdminSuspendBoutiquePayload): void {
    this.actionInProgress = true;

    this.adminService
      .suspendBoutique(boutiqueId, payload)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Boutique suspendue';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.triggerReload();
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Suspension impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private triggerReload(): void {
    this.pageChange$.next({ page: this.page, limit: this.limit });
  }

  private normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }
}

@Component({
  selector: 'app-suspend-boutique-dialog',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Suspension</h2>
    <div mat-dialog-content>
      <p class="m-b-16">
        Suspendre <strong>{{ data.boutique.nom }}</strong> ?
      </p>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Motif de suspension</mat-label>
        <textarea
          matInput
          [formControl]="motifControl"
          rows="4"
          placeholder="Ex: boutique inactive"
        ></textarea>
        @if (motifControl.hasError('required')) {
          <mat-error>Le motif est obligatoire.</mat-error>
        }
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="warn" [disabled]="motifControl.invalid" (click)="onConfirm()">
        Suspendre
      </button>
    </div>
  `,
})
export class SuspendBoutiqueDialogComponent {
  motifControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  constructor(
    private dialogRef: MatDialogRef<SuspendBoutiqueDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SuspendBoutiqueDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.motifControl.value.trim());
  }
}

@Component({
  selector: 'app-reactivate-boutique-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Reactivation</h2>
    <div mat-dialog-content>
      <p>
        Reactiver <strong>{{ data.boutique.nom }}</strong> ?
      </p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="primary" (click)="onConfirm()">Reactiver</button>
    </div>
  `,
})
export class ReactivateBoutiqueDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ReactivateBoutiqueDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SuspendBoutiqueDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

@Component({
  selector: 'app-approve-boutique-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Approbation</h2>
    <div mat-dialog-content>
      <p>
        Approuver <strong>{{ data.boutique.nom }}</strong> ?
      </p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="primary" (click)="onConfirm()">Approuver</button>
    </div>
  `,
})
export class ApproveBoutiqueDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ApproveBoutiqueDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SuspendBoutiqueDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
