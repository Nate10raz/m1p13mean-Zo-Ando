import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { Avis, AvisService } from 'src/app/services/avis.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { StarRatingComponent } from 'src/app/components/star-rating/star-rating.component';

@Component({
  selector: 'app-admin-avis-signales',
  standalone: true,
  imports: [CommonModule, MaterialModule, StarRatingComponent],
  templateUrl: './avis-signales.component.html',
  styles: [
    `
      .avis-item {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        background: white;
      }
      .signalement-info {
        background: #fef2f2;
        border: 1px solid #fee2e2;
        border-radius: 8px;
        padding: 12px;
        margin-top: 16px;
      }
    `,
  ],
})
export class AdminAvisSignalesComponent implements OnInit {
  avisList: Avis[] = [];
  isLoading = false;

  constructor(
    private avisService: AvisService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSignaledAvis();
  }

  loadSignaledAvis(): void {
    this.isLoading = true;
    this.avisService
      .getSignaledAvis()
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res: any) => {
          // Le backend retourne directement le tableau ou un ApiResponse?
          // Dans mon AvisController j'ai fait res.status(200).json(avis);
          this.avisList = res;
        },
        error: () =>
          this.snackBar.open('Erreur lors du chargement des avis.', 'Fermer', { duration: 3000 }),
      });
  }

  handleAction(avis: Avis, action: 'accepter' | 'rejeter'): void {
    const msg = action === 'accepter' ? 'Valider le signalement ?' : 'Rejeter le signalement ?';
    if (!confirm(msg)) return;

    this.avisService.handleSignalement(avis._id, action).subscribe({
      next: () => {
        this.snackBar.open('Action effectuée avec succès.', 'Fermer', { duration: 3000 });
        this.avisList = this.avisList.filter((a) => a._id !== avis._id);
        this.cdr.markForCheck();
      },
      error: (err) =>
        this.snackBar.open(err?.error?.message || 'Erreur.', 'Fermer', { duration: 3000 }),
    });
  }

  getStars(note: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => i + 1);
  }

  getTargetName(avis: any): string {
    if (avis.type === 'produit') {
      return avis.produitId?.titre || 'Produit inconnu';
    }
    return avis.boutiqueId?.nom || 'Boutique inconnue';
  }
}
