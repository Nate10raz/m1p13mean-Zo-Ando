import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../material.module';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged, finalize, merge, Subscription } from 'rxjs';
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

  constructor(
    private adminService: AdminService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBoutiques();

    const search$ = this.searchControl.valueChanges.pipe(debounceTime(400), distinctUntilChanged());
    const filters$ = merge(
      search$,
      this.statusControl.valueChanges,
      this.sortByControl.valueChanges,
      this.sortDirControl.valueChanges
    );

    this.subscriptions.add(
      filters$.subscribe(() => {
        this.page = 1;
        this.loadBoutiques();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.loadBoutiques();
  }

  private loadBoutiques(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const search = this.searchControl.value.trim();
    const statusValue = this.statusControl.value;

    this.adminService
      .getBoutiques({
        page: this.page,
        limit: this.limit,
        includeUser: true,
        search: search.length ? search : undefined,
        status: statusValue === 'all' ? undefined : statusValue,
        sortBy: this.sortByControl.value,
        sortDir: this.sortDirControl.value,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          const items = response?.data?.items ?? [];
          this.total = response?.data?.total ?? items.length;
          this.dataSource = items.map((item, index) => this.mapBoutique(item, index));
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger la liste des boutiques.';
          this.dataSource = [];
          this.total = 0;
        },
      });
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

  private mapStatus(
    status: AdminBoutiqueStatus | undefined,
    isActive: boolean
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
    const owner = item.user ?? (typeof item.userId === 'object' ? item.userId : undefined);
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
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Boutique reactivee';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.loadBoutiques();
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
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Boutique approuvee';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.loadBoutiques();
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
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Boutique suspendue';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.loadBoutiques();
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Suspension impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
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
        @if(motifControl.hasError('required')) {
        <mat-error>Le motif est obligatoire.</mat-error>
        }
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button
        mat-flat-button
        color="warn"
        [disabled]="motifControl.invalid"
        (click)="onConfirm()"
      >
        Suspendre
      </button>
    </div>
  `,
})
export class SuspendBoutiqueDialogComponent {
  motifControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  constructor(
    private dialogRef: MatDialogRef<SuspendBoutiqueDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SuspendBoutiqueDialogData
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
    @Inject(MAT_DIALOG_DATA) public data: SuspendBoutiqueDialogData
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
    @Inject(MAT_DIALOG_DATA) public data: SuspendBoutiqueDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
