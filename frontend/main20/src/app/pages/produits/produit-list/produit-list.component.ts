import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
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

import { MaterialModule } from '../../../material.module';
import { ProductCreateResponse, ProductService } from 'src/app/services/product.service';
import { CategoryNode, CategoryService } from 'src/app/services/category.service';

interface ProductRow {
  id: number;
  productId: string;
  image: string;
  titre: string;
  slug: string;
  categorieId: string;
  prix: number;
  stock: number;
  estActif: boolean;
}

@Component({
  selector: 'app-produit-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
  ],
  templateUrl: './produit-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppProduitListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['produit', 'categorie', 'prix', 'stock', 'statut', 'actions'];
  dataSource: ProductRow[] = [];
  isLoading = false;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 10;
  categoryMap = new Map<string, CategoryNode>();

  searchControl = new FormControl('', { nonNullable: true });
  statusControl = new FormControl<'all' | 'active' | 'inactive'>('all', { nonNullable: true });

  private readonly subscriptions = new Subscription();
  private readonly pageChange$ = new Subject<{ page: number; limit: number }>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    const search$ = this.searchControl.valueChanges.pipe(
      map((value) => this.normalizeSearch(value)),
      debounceTime(350),
      distinctUntilChanged(),
      startWith(this.normalizeSearch(this.searchControl.value)),
    );

    const status$ = this.statusControl.valueChanges.pipe(startWith(this.statusControl.value));

    const filters$ = combineLatest([search$, status$]).pipe(
      map(([search, status]) => ({ search, status })),
      distinctUntilChanged(
        (prev, curr) => prev.search === curr.search && prev.status === curr.status,
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
      switchMap((query) =>
        this.productService
          .listProducts({
            page: query.page,
            limit: query.limit,
            search: query.search.length ? query.search : undefined,
            estActif: query.status === 'all' ? undefined : query.status === 'active',
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
          this.errorMessage = error?.error?.message ?? 'Impossible de charger les produits.';
          this.dataSource = [];
          this.total = 0;
          this.cdr.markForCheck();
          return;
        }

        const items = response?.data?.items ?? [];
        this.total = response?.data?.total ?? items.length;
        this.dataSource = items.map((item, index) => this.mapProduct(item, index));
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

  trackByProductId(index: number, row: ProductRow): string {
    return row.productId || String(index);
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
    return `Ar ${formatted}`;
  }

  private mapProduct(item: ProductCreateResponse, index: number): ProductRow {
    const images = item.images ?? [];
    const main = images.find((image) => image.isMain) ?? images[0];
    const fallbackIndex = (index % 4) + 1;

    return {
      id: index + 1,
      productId: item._id,
      image: main?.url ?? `assets/images/products/product-${fallbackIndex}.png`,
      titre: item.titre,
      slug: item.slug ?? '',
      categorieId: item.categorieId,
      prix: item.prixBaseActuel,
      stock: item.stock?.quantite ?? 0,
      estActif: Boolean(item.estActif),
    };
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

  private normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }
}
