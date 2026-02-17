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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { ProductCreateResponse, ProductService } from 'src/app/services/product.service';

@Component({
  selector: 'app-produit-media',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule],
  templateUrl: './produit-media.component.html',
  styles: [
    `
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

      .thumb-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 6px;
        border-radius: 10px;
        border: 1px solid #e0e0e0;
        background: #fff;
      }

      .thumb-card.active {
        border-color: #42a5f5;
        box-shadow: 0 0 0 2px rgba(66, 165, 245, 0.2);
      }

      .thumb {
        width: 64px;
        height: 64px;
        border-radius: 8px;
        border: none;
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

      .thumb-meta {
        font-size: 11px;
      }

      .thumb-label {
        font-weight: 600;
      }

      .thumb-actions {
        display: flex;
        gap: 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppProduitMediaComponent implements OnInit, OnDestroy {
  isLoading = false;
  isSubmitting = false;
  isDeleting = false;
  isSettingMain = false;
  errorMessage = '';
  product: ProductCreateResponse | null = null;
  productId = '';
  activeImageUrl = '';
  existingImages: NonNullable<ProductCreateResponse['images']> = [];
  selectedImages: File[] = [];
  replaceImagesControl = new FormControl(false, { nonNullable: true });
  deletingImageId: string | null = null;
  settingMainImageId: string | null = null;

  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (!id) {
          this.errorMessage = 'Produit introuvable.';
          this.product = null;
          this.cdr.markForCheck();
          return;
        }
        this.productId = id;
        this.loadProduct(id);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    if (this.productId) {
      this.router.navigate(['/produits', this.productId]);
    } else {
      this.router.navigate(['/produits/liste']);
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      return;
    }
    this.selectedImages = Array.from(input.files);
    this.cdr.markForCheck();
  }

  removeFile(index: number): void {
    this.selectedImages = this.selectedImages.filter((_, i) => i !== index);
    if (!this.selectedImages.length) {
      this.replaceImagesControl.setValue(false);
    }
    this.cdr.markForCheck();
  }

  resetSelection(): void {
    this.selectedImages = [];
    this.replaceImagesControl.setValue(false);
    this.cdr.markForCheck();
  }

  requestDeleteImage(imageId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Supprimer une image',
        message: 'Cette action est definitive. Voulez-vous continuer ?',
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }
      this.deleteImage(imageId);
    });
  }

  deleteImage(imageId: string): void {
    if (!this.productId || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.deletingImageId = imageId;
    this.errorMessage = '';

    this.productService
      .deleteProductImage(this.productId, imageId)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.deletingImageId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Image supprimee';
          const updated = response?.data ?? null;
          if (updated) {
            this.product = updated;
            this.existingImages = updated.images ?? [];
            this.setupImages(updated);
          } else {
            this.existingImages = this.existingImages.filter((img) => img._id !== imageId);
            if (this.activeImageUrl) {
              const stillExists = this.existingImages.some(
                (img) => img.url === this.activeImageUrl,
              );
              if (!stillExists) {
                this.activeImageUrl = this.existingImages[0]?.url ?? '';
              }
            }
          }
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Suppression impossible.';
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4000 });
        },
      });
  }

  setMainImage(imageId: string): void {
    if (!this.productId || this.isSettingMain) {
      return;
    }
    this.isSettingMain = true;
    this.settingMainImageId = imageId;
    this.errorMessage = '';

    this.productService
      .setProductMainImage(this.productId, imageId)
      .pipe(
        finalize(() => {
          this.isSettingMain = false;
          this.settingMainImageId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const updated = response?.data ?? null;
          if (updated) {
            this.product = updated;
            this.existingImages = updated.images ?? [];
            this.setupImages(updated);
          } else {
            this.existingImages = this.existingImages.map((img) => ({
              ...img,
              isMain: img._id === imageId,
            }));
            this.activeImageUrl =
              this.existingImages.find((img) => img.isMain)?.url ?? this.activeImageUrl;
          }
          this.snackBar.open('Image principale mise a jour', 'Fermer', { duration: 3000 });
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Mise a jour impossible.';
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4000 });
        },
      });
  }

  selectImage(url: string): void {
    this.activeImageUrl = url;
  }

  submit(): void {
    if (!this.productId) {
      return;
    }
    if (!this.selectedImages.length) {
      this.snackBar.open('Selectionnez au moins une image.', 'Fermer', { duration: 3000 });
      return;
    }

    const formData = new FormData();
    this.selectedImages.forEach((file) => formData.append('images', file));
    formData.append('replaceImages', String(this.replaceImagesControl.value));

    this.isSubmitting = true;
    this.errorMessage = '';

    this.productService
      .updateProduct(this.productId, formData)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Images mises a jour';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.resetSelection();
          this.loadProduct(this.productId);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Mise a jour impossible.';
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4000 });
        },
      });
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
          this.existingImages = product.images ?? [];
          this.setupImages(product);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger le produit.';
        },
      });
  }

  private setupImages(product: ProductCreateResponse): void {
    const images = product.images ?? [];
    const main = images.find((item) => item.isMain) ?? images[0];
    this.activeImageUrl = main?.url ?? '';
  }
}

interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <div mat-dialog-content>
      <p>{{ data.message }}</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">{{ data.cancelText || 'Annuler' }}</button>
      <button mat-flat-button [color]="data.confirmColor || 'primary'" (click)="onConfirm()">
        {{ data.confirmText || 'Confirmer' }}
      </button>
    </div>
  `,
})
export class ConfirmDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
