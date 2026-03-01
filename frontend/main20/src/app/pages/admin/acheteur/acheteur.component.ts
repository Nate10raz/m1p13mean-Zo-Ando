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
import { RouterModule } from '@angular/router';
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
  AdminService,
  AdminSuspendUserPayload,
  AdminUser,
  AdminUserStatus,
} from 'src/app/services/admin.service';

export interface AcheteurRow {
  id: number;
  userId: string;
  avatar: string;
  nom: string;
  email: string;
  telephone: string;
  statut: 'actif' | 'en attente' | 'suspendu' | 'rejete';
  motifSuspension?: string;
}

interface SuspendUserDialogData {
  user: AcheteurRow;
}

interface ResetPasswordDialogData {
  user: AcheteurRow;
}

@Component({
  selector: 'app-admin-acheteur',
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
    RouterModule,
  ],
  templateUrl: './acheteur.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppAdminAcheteurComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['acheteur', 'contact', 'statut', 'actions'];
  dataSource: AcheteurRow[] = [];
  isLoading = false;
  actionInProgress = false;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;

  searchControl = new FormControl('', { nonNullable: true });
  statusControl = new FormControl<'all' | AdminUserStatus>('all', { nonNullable: true });
  sortByControl = new FormControl<'createdAt' | 'nom' | 'prenom' | 'status'>('createdAt', {
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
          .getUsers({
            page: query.page,
            limit: query.limit,
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
            error?.error?.message ?? 'Impossible de charger la liste des acheteurs.';
          this.dataSource = [];
          this.total = 0;
          this.cdr.markForCheck();
          return;
        }

        const items = response?.data?.items ?? [];
        this.total = response?.data?.total ?? items.length;
        this.dataSource = items.map((user, index) => this.mapUser(user, index));
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

  private mapUser(user: AdminUser, index: number): AcheteurRow {
    const fullName = [user.prenom, user.nom].filter(Boolean).join(' ').trim();
    const avatarIndex = (index % 4) + 1;
    const statut = this.mapStatus(user.status, user.isActive);

    return {
      id: index + 1,
      userId: user._id,
      avatar: `assets/images/profile/user-${avatarIndex}.jpg`,
      nom: fullName || user.email,
      email: user.email,
      telephone: user.telephone,
      statut,
      motifSuspension: user.motifSuspension,
    };
  }

  trackByUserId(index: number, row: AcheteurRow): string {
    return row.userId || String(index);
  }

  private mapStatus(status: AdminUserStatus | undefined, isActive: boolean): AcheteurRow['statut'] {
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

  openSuspendDialog(user: AcheteurRow): void {
    if (this.actionInProgress || user.statut === 'suspendu') {
      return;
    }

    const dialogRef = this.dialog.open(SuspendUserDialogComponent, {
      width: '420px',
      data: { user },
    });

    dialogRef.afterClosed().subscribe((motif: string | undefined) => {
      if (!motif) {
        return;
      }
      this.suspendUser(user.userId, { motif });
    });
  }

  openReactivateDialog(user: AcheteurRow): void {
    if (this.actionInProgress || user.statut !== 'suspendu') {
      return;
    }

    const dialogRef = this.dialog.open(ReactivateUserDialogComponent, {
      width: '380px',
      data: { user },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.reactivateUser(user);
    });
  }

  openResetPasswordDialog(user: AcheteurRow): void {
    if (this.actionInProgress) {
      return;
    }

    const dialogRef = this.dialog.open(ResetUserPasswordDialogComponent, {
      width: '420px',
      data: { user },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.resetUserPassword(user.userId);
    });
  }

  private reactivateUser(user: AcheteurRow): void {
    if (this.actionInProgress || user.statut !== 'suspendu') {
      return;
    }

    this.actionInProgress = true;
    this.adminService
      .reactivateUser(user.userId)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Utilisateur reactive';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.triggerReload();
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Reactivation impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private resetUserPassword(userId: string): void {
    this.actionInProgress = true;

    this.adminService
      .resetUserPassword(userId)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Lien de reinitialisation envoye';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Reinitialisation impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private suspendUser(userId: string, payload: AdminSuspendUserPayload): void {
    this.actionInProgress = true;

    this.adminService
      .suspendUser(userId, payload)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Utilisateur suspendu';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.triggerReload();
        },
        error: (error) => {
          console.log(error);
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
  selector: 'app-reset-user-password-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Reinitialiser le mot de passe</h2>
    <div mat-dialog-content>
      <p class="m-b-8">
        Un lien de reinitialisation sera envoye a l'email de
        <strong>{{ data.user.nom }}</strong>.
      </p>
      <p class="text-muted m-0">L'utilisateur choisira un nouveau mot de passe via ce lien.</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="onConfirm()">
        Envoyer le lien
      </button>
    </div>
  `,
})
export class ResetUserPasswordDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ResetUserPasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ResetPasswordDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

@Component({
  selector: 'app-suspend-user-dialog',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Suspension</h2>
    <div mat-dialog-content>
      <p class="m-b-16">
        Suspendre <strong>{{ data.user.nom }}</strong> ?
      </p>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Motif de suspension</mat-label>
        <textarea
          matInput
          [formControl]="motifControl"
          rows="4"
          placeholder="Ex: abus de service"
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
export class SuspendUserDialogComponent {
  motifControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  constructor(
    private dialogRef: MatDialogRef<SuspendUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SuspendUserDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close(this.motifControl.value.trim());
  }
}

@Component({
  selector: 'app-reactivate-user-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Reactivation</h2>
    <div mat-dialog-content>
      <p>
        Reactiver <strong>{{ data.user.nom }}</strong> ?
      </p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="primary" (click)="onConfirm()">Reactiver</button>
    </div>
  `,
})
export class ReactivateUserDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ReactivateUserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SuspendUserDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
