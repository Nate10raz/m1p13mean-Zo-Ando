import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, finalize, Subscription } from 'rxjs';

import { MaterialModule } from 'src/app/material.module';
import {
  AppBlogCardsComponent,
  ProductCard,
} from 'src/app/components/blog-card/blog-card.component';
import { CategoryNode, CategoryService } from 'src/app/services/category.service';
import { ProductCreateResponse, ProductService } from 'src/app/services/product.service';

type ViewMode = 'pagination' | 'infinite';
type SortMode = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-accueil-client',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    MatPaginatorModule,
    AppBlogCardsComponent,
  ],
  templateUrl: './accueil-client.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccueilClientComponent implements OnInit, OnDestroy, AfterViewInit {
  cards: ProductCard[] = [];
  displayCards: ProductCard[] = [];
  categories: CategoryNode[] = [];

  isLoading = false;
  isLoadingMore = false;
  isLoadingCategories = false;
  errorMessage = '';

  total = 0;
  totalPages = 1;
  page = 1;
  limit = 12;

  searchControl = new FormControl('', { nonNullable: true });
  categoryControl = new FormControl<string>('all', { nonNullable: true });
  sortControl = new FormControl<SortMode>('name-asc', { nonNullable: true });
  minPriceControl = new FormControl<number | null>(null);
  maxPriceControl = new FormControl<number | null>(null);
  viewModeControl = new FormControl<ViewMode>('pagination', { nonNullable: true });

  private readonly subscriptions = new Subscription();
  private observer: IntersectionObserver | null = null;
  private infiniteTriggerRef: ElementRef<HTMLElement> | null = null;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef,
  ) {}

  @ViewChild('infiniteTrigger')
  set infiniteTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.infiniteTriggerRef = element ?? null;
    this.setupObserver();
  }

  ngOnInit(): void {
    this.loadCategories();
    this.fetchProducts(1);

    this.subscriptions.add(
      this.searchControl.valueChanges
        .pipe(debounceTime(350), distinctUntilChanged())
        .subscribe(() => this.resetAndFetch()),
    );

    this.subscriptions.add(
      this.categoryControl.valueChanges.subscribe(() => this.resetAndFetch()),
    );

    this.subscriptions.add(
      this.sortControl.valueChanges.subscribe(() => this.resetAndFetch()),
    );

    this.subscriptions.add(
      this.minPriceControl.valueChanges
        .pipe(debounceTime(250), distinctUntilChanged())
        .subscribe(() => this.resetAndFetch()),
    );

    this.subscriptions.add(
      this.maxPriceControl.valueChanges
        .pipe(debounceTime(250), distinctUntilChanged())
        .subscribe(() => this.resetAndFetch()),
    );

    this.subscriptions.add(
      this.viewModeControl.valueChanges.subscribe(() => {
        this.resetAndFetch();
        this.setupObserver();
      }),
    );
  }

  ngAfterViewInit(): void {
    this.setupObserver();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.disconnectObserver();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.fetchProducts(this.page);
  }

  loadNextPage(): void {
    if (this.isLoading || this.isLoadingMore || !this.hasMore) {
      return;
    }

    const nextPage = this.page + 1;
    this.fetchProducts(nextPage, true);
  }

  get hasMore(): boolean {
    if (!this.totalPages) {
      return this.cards.length < this.total;
    }
    return this.page < this.totalPages;
  }

  private resetAndFetch(): void {
    this.page = 1;
    this.cards = [];
    this.displayCards = [];
    this.total = 0;
    this.totalPages = 1;
    this.fetchProducts(1);
  }

  private fetchProducts(page: number, append = false): void {
    if (append) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
      this.errorMessage = '';
    }
    this.cdr.markForCheck();

    const search = this.normalizeSearch(this.searchControl.value);
    const categoryId = this.categoryControl.value;
    const { minPrix, maxPrix } = this.resolvePriceRange();

    this.productService
      .listProducts({
        page,
        limit: this.limit,
        search: search.length ? search : undefined,
        estActif: true,
        categorieId: categoryId !== 'all' ? categoryId : undefined,
        minPrix,
        maxPrix,
        sort: this.sortControl.value,
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const items = response?.data?.items ?? [];
          const mapped = items.map((item, index) => this.mapProduct(item, index));

          if (append) {
            this.cards = [...this.cards, ...mapped];
          } else {
            this.cards = mapped;
          }

          this.page = response?.data?.page ?? page;
          this.total = response?.data?.total ?? this.cards.length;
          this.totalPages =
            response?.data?.totalPages ?? Math.max(1, Math.ceil(this.total / this.limit));

          this.displayCards = this.cards;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger les produits.';
          if (!append) {
            this.cards = [];
            this.displayCards = [];
            this.total = 0;
            this.totalPages = 1;
          }
          this.cdr.markForCheck();
        },
      });
  }

  private loadCategories(): void {
    this.isLoadingCategories = true;
    this.categoryService
      .listCategories()
      .pipe(
        finalize(() => {
          this.isLoadingCategories = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const list = Array.isArray(response?.data) ? response?.data : [];
          this.categories = list.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        },
        error: () => {
          this.categories = [];
        },
      });
  }

  private mapProduct(item: ProductCreateResponse, index: number): ProductCard {
    const images = item.images ?? [];
    const main = images.find((image) => image.isMain) ?? images[0];
    const fallbackIndex = (index % 6) + 1;
    const boutiqueLabel = item.boutique?.nom ?? item.boutiqueId ?? '-';

    return {
      id: item._id,
      imgSrc: main?.url ?? `assets/images/products/product-${fallbackIndex}.png`,
      title: item.titre,
      price: Number(item.prixBaseActuel) || 0,
      boutique: boutiqueLabel,
      categorieId: item.categorieId,
      stock: item.stock?.quantite ?? 0,
      createdAt: item.createdAt,
    };
  }

  private normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  }

  private parseNumber(value: number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  private resolvePriceRange(): { minPrix?: number; maxPrix?: number } {
    const minPrice = this.parseNumber(this.minPriceControl.value);
    const maxPrice = this.parseNumber(this.maxPriceControl.value);
    let min = minPrice ?? undefined;
    let max = maxPrice ?? undefined;

    if (min !== undefined && max !== undefined && max < min) {
      [min, max] = [max, min];
    }

    return { minPrix: min, maxPrix: max };
  }

  private setupObserver(): void {
    if (this.viewModeControl.value !== 'infinite') {
      this.disconnectObserver();
      return;
    }

    if (!this.infiniteTriggerRef) {
      return;
    }

    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.loadNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    this.observer.observe(this.infiniteTriggerRef.nativeElement);
  }

  private disconnectObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
