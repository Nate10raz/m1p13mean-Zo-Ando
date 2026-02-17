import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged, finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { ProductCreateResponse, ProductService } from 'src/app/services/product.service';

interface StockRow {
  id: number;
  productId: string;
  image: string;
  titre: string;
  slug: string;
  quantite: number;
  seuilAlerte: number;
  draftSeuil: number;
  estActif: boolean;
  isSaving: boolean;
}

@Component({
  selector: 'app-produit-stock-alert',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatTableModule, MatPaginatorModule],
  templateUrl: './produit-stock-alert.component.html',
  styles: [
    `
      .table-responsive {
        overflow: auto;
      }

      .seuil-field {
        min-width: 130px;
      }

      .product-cell {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .product-info h6 {
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppProduitStockAlertComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['produit', 'stock', 'seuil', 'statut', 'actions'];
  dataSource: StockRow[] = [];
  isLoading = false;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;

  searchControl = new FormControl('', { nonNullable: true });

  private readonly subscriptions = new Subscription();

  constructor(
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchProducts();

    this.subscriptions.add(
      this.searchControl.valueChanges
        .pipe(debounceTime(350), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.fetchProducts();
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.fetchProducts();
  }

  onDraftChange(row: StockRow, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    row.draftSeuil = Number.isNaN(value) ? row.draftSeuil : value;
  }

  saveRow(row: StockRow): void {
    const value = Number(row.draftSeuil);
    if (Number.isNaN(value) || value < 0) {
      this.snackBar.open('Seuil invalide.', 'Fermer', { duration: 3000 });
      return;
    }

    if (value === row.seuilAlerte) {
      this.snackBar.open('Aucun changement.', 'Fermer', { duration: 2000 });
      return;
    }

    row.isSaving = true;
    this.cdr.markForCheck();

    this.productService
      .updateStockAlert(row.productId, value)
      .pipe(
        finalize(() => {
          row.isSaving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          row.seuilAlerte = value;
          row.draftSeuil = value;
          this.snackBar.open(response?.message ?? 'Seuil mis a jour', 'Fermer', {
            duration: 3000,
          });
          this.cdr.markForCheck();
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Mise a jour impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  isLowStock(row: StockRow): boolean {
    return row.quantite <= row.seuilAlerte;
  }

  trackByProductId(index: number, row: StockRow): string {
    return row.productId || String(index);
  }

  private fetchProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const search = this.searchControl.value.trim();

    this.productService
      .listProducts({
        page: this.page,
        limit: this.limit,
        search: search.length ? search : undefined,
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          const items = response?.data?.items ?? [];
          this.total = response?.data?.total ?? items.length;
          this.dataSource = items.map((item, index) => this.mapProduct(item, index));
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger les produits.';
          this.dataSource = [];
          this.total = 0;
        },
      });
  }

  private mapProduct(item: ProductCreateResponse, index: number): StockRow {
    const images = item.images ?? [];
    const main = images.find((image) => image.isMain) ?? images[0];
    const fallbackIndex = (index % 4) + 1;
    const quantite = item.stock?.quantite ?? 0;
    const seuilAlerte = item.stock?.seuilAlerte ?? 0;

    return {
      id: index + 1,
      productId: item._id,
      image: main?.url ?? `assets/images/products/product-${fallbackIndex}.png`,
      titre: item.titre,
      slug: item.slug ?? '',
      quantite,
      seuilAlerte,
      draftSeuil: seuilAlerte,
      estActif: Boolean(item.estActif),
      isSaving: false,
    };
  }
}
