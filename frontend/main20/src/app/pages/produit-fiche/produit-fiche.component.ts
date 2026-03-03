import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../material.module';
import { ProductCreateResponse, ProductService } from 'src/app/services/product.service';
import { CategoryNode, CategoryService } from 'src/app/services/category.service';
import { Avis, AvisService } from 'src/app/services/avis.service';
import { AuthService } from 'src/app/services/auth.service';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { StarRatingComponent } from 'src/app/components/star-rating/star-rating.component';

import { PromptDialogComponent } from 'src/app/components/prompt-dialog/prompt-dialog.component';

@Component({
  selector: 'app-produit-fiche',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, StarRatingComponent],
  templateUrl: './produit-fiche.component.html',
  styles: [
    `
      .product-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .product-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 20px;
      }

      @media (max-width: 900px) {
        .product-grid {
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
        min-height: 280px;
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

      .chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppProduitFicheComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';
  product: ProductCreateResponse | null = null;
  mainImageUrl = '';
  activeImageUrl = '';
  categoryMap = new Map<string, CategoryNode>();

  // Avis
  avisList: Avis[] = [];
  isLoadingAvis = false;
  canReview = false;
  newAvis = {
    note: 5,
    titre: '',
    commentaire: '',
  };
  isSubmittingAvis = false;

  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private categoryService: CategoryService,
    private avisService: AvisService,
    private authService: AuthService,
    private location: Location,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (!id) {
          this.errorMessage = 'Produit introuvable.';
          this.product = null;
          this.cdr.markForCheck();
          return;
        }
        this.loadProduct(id);
        this.loadAvis(id);
        this.checkCanReview(id);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.location.back();
  }

  onAddToCart(): void {
    this.snackBar.open('Ajout au panier a venir.', 'Fermer', { duration: 3000 });
  }

  selectImage(url: string): void {
    this.activeImageUrl = url;
  }

  getCategoryLabel(id: any): string {
    if (!id) {
      return '-';
    }
    if (typeof id === 'object') {
      return id.nom || '-';
    }
    return this.categoryMap.get(id)?.nom ?? id;
  }

  formatPrice(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
    return `Ar ${formatted}`;
  }

  formatRating(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '0/5';
    }
    return `${Number(value).toFixed(1)}/5`;
  }

  private loadProduct(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.product = null;
    this.cdr.markForCheck();

    this.productService
      .getProductById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const product = response?.data ?? null;
          if (!product) {
            this.errorMessage = 'Produit introuvable.';
            this.product = null;
            return;
          }
          this.product = product;
          this.setupImages(product);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger le produit.';
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4000 });
        },
      });
  }

  private setupImages(product: ProductCreateResponse): void {
    const images = product.images ?? [];
    const main = images.find((item) => item.isMain) ?? images[0];
    this.mainImageUrl = main?.url ?? '';
    this.activeImageUrl = this.mainImageUrl;
  }

  private loadCategories(): void {
    this.categoryService.listCategories().subscribe({
      next: (response) => {
        const payload = response?.data ?? [];
        const list = Array.isArray(payload) ? payload : [];
        this.categoryMap = new Map(list.map((item) => [item._id, item]));
        this.cdr.markForCheck();
      },
      error: () => {
        this.categoryMap = new Map();
      },
    });
  }

  // --- Avis Methods ---

  private loadAvis(id: string): void {
    this.isLoadingAvis = true;
    this.avisService.getByEntity('produit', id).subscribe({
      next: (avis) => {
        this.avisList = avis;
        this.isLoadingAvis = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingAvis = false;
        this.cdr.markForCheck();
      },
    });
  }

  private checkCanReview(id: string): void {
    if (this.authService.getCurrentRole() !== 'client') {
      this.canReview = false;
      return;
    }
    // L'éligibilité est vérifiée côté serveur lors de la soumission.
    // On pourrait aussi avoir un endpoint dédié pour vérifier à l'avance et afficher/masquer le formulaire.
    this.canReview = true;
  }

  onRate(note: number): void {
    this.newAvis.note = note;
  }

  submitAvis(): void {
    if (!this.product) return;
    if (this.newAvis.note < 1 || this.newAvis.note > 5) {
      this.snackBar.open('La note doit être entre 1 et 5.', 'Fermer', { duration: 3000 });
      return;
    }

    this.isSubmittingAvis = true;
    this.cdr.markForCheck();

    this.avisService
      .createAvis({
        type: 'produit',
        produitId: this.product._id,
        boutiqueId: this.product.boutiqueId,
        note: this.newAvis.note,
        titre: this.newAvis.titre,
        commentaire: this.newAvis.commentaire,
      })
      .pipe(
        finalize(() => {
          this.isSubmittingAvis = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (savedAvis: Avis) => {
          this.snackBar.open('Votre avis a été publié !', 'Fermer', { duration: 3000 });
          this.avisList.unshift(savedAvis);
          this.newAvis = { note: 5, titre: '', commentaire: '' };
          // Rafraîchir les stats du produit (note moyenne)
          this.loadProduct(this.product!._id);
        },
        error: (err: any) => {
          const msg = err?.error?.message || "Erreur lors de la publication de l'avis.";
          this.snackBar.open(msg, 'Fermer', { duration: 5000 });
        },
      });
  }

  reportAvis(avis: Avis): void {
    const dialogRef = this.dialog.open(PromptDialogComponent, {
      data: {
        title: 'Signaler un avis',
        message: 'Pour quelle raison souhaitez-vous signaler cet avis ?',
        placeholder: 'Raison du signalement...',
        confirmText: 'Signaler',
        cancelText: 'Annuler',
      },
    });

    dialogRef.afterClosed().subscribe((raison) => {
      if (raison && raison.trim()) {
        this.avisService.reportAvis(avis._id, raison).subscribe({
          next: () => {
            this.snackBar.open("Avis signalé à l'administration.", 'Fermer', { duration: 3000 });
            avis.estSignale = true;
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.snackBar.open(err?.error?.message || 'Erreur lors du signalement.', 'Fermer', {
              duration: 3000,
            });
          },
        });
      }
    });
  }

  getStars(note: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => i + 1);
  }

  scrollToAvis(event: Event): void {
    event.preventDefault();
    const element = document.getElementById('avis-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
