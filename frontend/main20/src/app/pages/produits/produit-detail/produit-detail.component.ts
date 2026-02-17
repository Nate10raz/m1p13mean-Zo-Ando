import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { ProductCreateResponse, ProductService } from 'src/app/services/product.service';
import { CategoryNode, CategoryService } from 'src/app/services/category.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-produit-detail',
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './produit-detail.component.html',
  styles: [
    `
      .product-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .status-pill {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
      }

      .status-pill.active {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .status-pill.inactive {
        background: #ffebee;
        color: #c62828;
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
export class AppProduitDetailComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';
  product: ProductCreateResponse | null = null;
  mainImageUrl = '';
  activeImageUrl = '';
  categoryMap = new Map<string, CategoryNode>();
  userRole: string | null = null;

  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getCurrentRole();
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
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.location.back();
  }

  onEdit(): void {
    if (!this.product?._id) {
      return;
    }
    this.router.navigate(['/produits', this.product._id, 'modifier']);
  }

  onDelete(): void {
    this.snackBar.open('Suppression a venir.', 'Fermer', { duration: 3000 });
  }

  selectImage(url: string): void {
    this.activeImageUrl = url;
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

  getCategoryLabel(id: string | undefined | null): string {
    if (!id) {
      return '-';
    }
    return this.categoryMap.get(id)?.nom ?? id;
  }

  formatPrice(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
    return `${formatted} Ar`;
  }
}
