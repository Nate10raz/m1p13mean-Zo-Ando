import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../../../material.module';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { finalize } from 'rxjs';

import {
    AdminService,
    FraisLivraison,
} from 'src/app/services/admin.service';

@Component({
    selector: 'app-admin-frais-livraison',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MaterialModule,
        MatTableModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatPaginatorModule,
        TablerIconsModule
    ],
    templateUrl: './frais-livraison.component.html',
    styleUrls: ['./frais-livraison.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppAdminFraisLivraisonComponent implements OnInit {
    displayedColumns: string[] = ['date', 'montant', 'type', 'updatedBy', 'description'];
    history: FraisLivraison[] = [];
    currentFee: FraisLivraison | null = null;

    isLoading = false;
    isSaving = false;
    total = 0;
    page = 1;
    limit = 10;

    fraisForm = new FormGroup({
        montant: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
        type: new FormControl<'fixe' | 'pourcentage'>('fixe', [Validators.required]),
        description: new FormControl('', [Validators.maxLength(200)]),
    });

    constructor(
        private adminService: AdminService,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadCurrentFee();
        this.loadHistory();
    }

    loadCurrentFee(): void {
        this.adminService.getFraisLivraisonSupermarche().subscribe({
            next: (res) => {
                if (res.data) {
                    this.currentFee = res.data;
                    this.fraisForm.patchValue({
                        montant: res.data.montant,
                        type: res.data.type,
                        description: res.data.description || '',
                    });
                }
                this.cdr.markForCheck();
            },
        });
    }

    loadHistory(): void {
        this.isLoading = true;
        this.adminService
            .getFraisLivraisonHistory({ page: this.page, limit: this.limit })
            .pipe(finalize(() => {
                this.isLoading = false;
                this.cdr.markForCheck();
            }))
            .subscribe({
                next: (res) => {
                    this.history = res.data?.items || [];
                    this.total = res.data?.total || 0;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.snackBar.open('Erreur lors du chargement de l\'historique', 'Fermer', { duration: 3000 });
                }
            });
    }

    onSubmit(): void {
        if (this.fraisForm.invalid || this.isSaving) return;

        this.isSaving = true;
        const val = this.fraisForm.value;

        this.adminService.updateFraisLivraisonSupermarche({
            montant: val.montant!,
            type: val.type!,
            description: val.description || '',
        })
            .pipe(finalize(() => {
                this.isSaving = false;
                this.cdr.markForCheck();
            }))
            .subscribe({
                next: (res) => {
                    this.snackBar.open('Frais de livraison mis à jour avec succès', 'Fermer', { duration: 3000 });
                    this.currentFee = res.data;
                    this.loadHistory();
                },
                error: (err) => {
                    const msg = err?.error?.message || 'Erreur lors de la mise à jour';
                    this.snackBar.open(msg, 'Fermer', { duration: 4000 });
                }
            });
    }

    onPageChange(event: PageEvent): void {
        this.page = event.pageIndex + 1;
        this.limit = event.pageSize;
        this.loadHistory();
    }
}
