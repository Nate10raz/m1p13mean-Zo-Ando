import { CommonModule } from '@angular/common';
import { NestedTreeControl } from '@angular/cdk/tree';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { debounceTime, distinctUntilChanged, finalize, map, Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '../../../material.module';
import { ProductService } from 'src/app/services/product.service';
import { CategoryNode, CategoryService } from 'src/app/services/category.service';
import { AuthService } from 'src/app/services/auth.service';

interface CategoryPickerDialogData {
  categories: CategoryNode[];
}

@Component({
  selector: 'app-produit-create',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './produit-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppProduitCreateComponent implements OnInit, OnDestroy {
  isSubmitting = false;
  serverError = '';
  selectedImages: File[] = [];
  categories: CategoryNode[] = [];
  isLoadingCategories = false;
  selectedCategoryLabel = '';
  isBoutiqueUser = false;
  private categoryPathMap = new Map<string, string>();
  private readonly subscriptions = new Subscription();

  form = this.fb.group({
    boutiqueId: ['', Validators.required],
    titre: ['', Validators.required],
    slug: [''],
    description: [''],
    descriptionCourte: [''],
    categorieId: ['', Validators.required],
    sousCategoriesIds: [''],
    tags: [''],
    attributs: [''],
    prixBaseActuel: [null as number | null, [Validators.required, Validators.min(0)]],
    stockQuantite: [null as number | null],
    stockSeuilAlerte: [null as number | null],
    hasVariations: [false],
    estActif: [true],
    sku: [''],
  });

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const role = this.authService.getCurrentRole();
    this.isBoutiqueUser = role?.toLowerCase() === 'boutique';
    if (this.isBoutiqueUser) {
      this.loadBoutiqueForUser();
    }

    this.loadCategories();

    this.subscriptions.add(
      this.form
        .get('titre')!
        .valueChanges.pipe(
          debounceTime(200),
          map((value) => (value ?? '').trim()),
          distinctUntilChanged(),
        )
        .subscribe((value) => {
          const slugControl = this.form.get('slug') as FormControl<string>;
          if (!slugControl.value || !slugControl.dirty) {
            slugControl.setValue(this.slugify(value), { emitEvent: false });
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
          const payload = response?.data;
          const list = Array.isArray(payload) ? payload : [];
          this.categories = this.buildTree(list);
          this.categoryPathMap = this.buildCategoryPathMap(this.categories);
          this.cdr.markForCheck();
        },
        error: () => {
          this.categories = [];
          this.categoryPathMap = new Map();
        },
      });
  }

  private loadBoutiqueForUser(): void {
    this.authService.getBoutiqueMe().subscribe({
      next: (response) => {
        const boutiqueId = response?.data?._id;
        if (boutiqueId) {
          this.form.patchValue({ boutiqueId });
          this.form.get('boutiqueId')?.disable({ emitEvent: false });
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.snackBar.open('Impossible de charger la boutique.', 'Fermer', { duration: 4000 });
      },
    });
  }

  openCategoryDialog(): void {
    if (!this.categories.length) {
      this.snackBar.open('Aucune categorie disponible.', 'Fermer', { duration: 3000 });
      return;
    }
    const dialogRef = this.dialog.open(CategoryPickerDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      data: { categories: this.categories },
    });

    dialogRef.afterClosed().subscribe((selected: CategoryNode | undefined) => {
      if (!selected) {
        return;
      }
      this.form.patchValue({ categorieId: selected._id });
      this.selectedCategoryLabel = this.categoryPathMap.get(selected._id) ?? `${selected.nom}`;
      this.cdr.markForCheck();
    });
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
    this.cdr.markForCheck();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const formData = new FormData();

    const boutiqueId = value.boutiqueId?.trim() ?? '';
    const titre = value.titre?.trim() ?? '';
    const categorieId = value.categorieId?.trim() ?? '';

    formData.append('boutiqueId', boutiqueId);
    formData.append('titre', titre);
    formData.append('categorieId', categorieId);
    formData.append('prixBaseActuel', String(value.prixBaseActuel ?? 0));

    this.appendIfPresent(formData, 'slug', value.slug);
    this.appendIfPresent(formData, 'description', value.description);
    this.appendIfPresent(formData, 'descriptionCourte', value.descriptionCourte);
    this.appendIfPresent(formData, 'sousCategoriesIds', value.sousCategoriesIds);
    this.appendIfPresent(formData, 'tags', value.tags);
    this.appendIfPresent(formData, 'attributs', value.attributs);
    this.appendIfPresent(formData, 'sku', value.sku);

    const hasStockValues = value.stockQuantite !== null || value.stockSeuilAlerte !== null;
    if (hasStockValues) {
      const quantite = value.stockQuantite ?? 0;
      const seuilAlerte = value.stockSeuilAlerte ?? 0;
      formData.append('stock', JSON.stringify({ quantite, seuilAlerte }));
    }

    formData.append('hasVariations', String(value.hasVariations));
    formData.append('estActif', String(value.estActif));

    this.selectedImages.forEach((file) => {
      formData.append('images', file);
    });

    this.isSubmitting = true;
    this.serverError = '';

    this.productService
      .createProduct(formData)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Produit cree';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          const createdId = response?.data?._id;
          this.resetForm();
          if (createdId) {
            this.router.navigate(['/produits', createdId]);
          }
        },
        error: (error) => {
          this.serverError = error?.error?.message ?? 'Creation impossible.';
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }

  resetForm(): void {
    const boutiqueId = this.isBoutiqueUser ? this.form.getRawValue().boutiqueId : '';
    this.form.reset({
      boutiqueId,
      titre: '',
      slug: '',
      description: '',
      descriptionCourte: '',
      categorieId: '',
      sousCategoriesIds: '',
      tags: '',
      attributs: '',
      prixBaseActuel: null,
      stockQuantite: null,
      stockSeuilAlerte: null,
      hasVariations: false,
      estActif: true,
      sku: '',
    });
    if (this.isBoutiqueUser) {
      this.form.get('boutiqueId')?.disable({ emitEvent: false });
    }
    this.selectedImages = [];
    this.selectedCategoryLabel = '';
    this.serverError = '';
    this.cdr.markForCheck();
  }

  private appendIfPresent(formData: FormData, key: string, value: string | null | undefined): void {
    const normalized = value?.trim();
    if (!normalized) {
      return;
    }
    formData.append(key, normalized);
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private buildTree(list: CategoryNode[]): CategoryNode[] {
    const map = new Map<string, CategoryNode & { children: CategoryNode[] }>();
    list.forEach((item) => {
      map.set(item._id, { ...item, children: [] });
    });

    const roots: CategoryNode[] = [];
    map.forEach((node) => {
      if (node.parentId) {
        const parent = map.get(node.parentId.toString());
        if (parent) {
          parent.children = parent.children ?? [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    const sortChildren = (node: CategoryNode) => {
      if (!node.children?.length) {
        return;
      }
      node.children.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
      node.children.forEach(sortChildren);
    };

    roots.forEach(sortChildren);
    return roots;
  }

  private buildCategoryPathMap(
    nodes: CategoryNode[],
    parentPath: string[] = [],
  ): Map<string, string> {
    const map = new Map<string, string>();
    const traverse = (items: CategoryNode[], path: string[]) => {
      items.forEach((node) => {
        const currentPath = [...path, node.nom];
        map.set(node._id, currentPath.join(' > '));
        if (node.children?.length) {
          traverse(node.children, currentPath);
        }
      });
    };

    traverse(nodes, parentPath);
    return map;
  }
}

@Component({
  selector: 'app-category-picker-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Choisir une categorie</h2>
    <div mat-dialog-content>
      @if (!data.categories.length) {
        <div class="p-12 text-muted">Aucune categorie disponible.</div>
      } @else {
        <mat-tree [dataSource]="dataSource" [treeControl]="treeControl" class="picker-tree">
          <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
            <div
              class="picker-node"
              [class.selected]="selected?._id === node._id"
              (click)="select(node)"
            >
              <span class="name">{{ node.nom }}</span>
              <span class="slug">/{{ node.slug }}</span>
            </div>
          </mat-tree-node>

          <mat-nested-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
            <div class="picker-node">
              <button mat-icon-button matTreeNodeToggle>
                <mat-icon>
                  {{ treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
                </mat-icon>
              </button>
              <div
                class="picker-node-content"
                [class.selected]="selected?._id === node._id"
                (click)="select(node)"
              >
                <span class="name">{{ node.nom }}</span>
                <span class="slug">/{{ node.slug }}</span>
              </div>
            </div>
            <div class="tree-children">
              <ng-container matTreeNodeOutlet></ng-container>
            </div>
          </mat-nested-tree-node>
        </mat-tree>
      }
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!selected" (click)="onConfirm()">
        Selectionner
      </button>
    </div>
  `,
  styles: [
    `
      .picker-tree {
        max-height: 420px;
        overflow: auto;
        margin-top: 8px;
      }

      .picker-node {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
      }

      .picker-node-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .picker-node.selected,
      .picker-node-content.selected {
        background: #e3f2fd;
      }

      .name {
        font-weight: 600;
      }

      .slug {
        color: #6c757d;
        font-size: 12px;
      }

      .tree-children {
        margin-left: 8px;
      }
    `,
  ],
})
export class CategoryPickerDialogComponent {
  treeControl = new NestedTreeControl<CategoryNode>((node) => node.children ?? []);
  dataSource = new MatTreeNestedDataSource<CategoryNode>();
  selected: CategoryNode | null = null;

  constructor(
    private dialogRef: MatDialogRef<CategoryPickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CategoryPickerDialogData,
  ) {
    this.dataSource.data = data.categories ?? [];
  }

  hasChild = (_: number, node: CategoryNode): boolean =>
    Array.isArray(node.children) && node.children.length > 0;

  select(node: CategoryNode): void {
    this.selected = node;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (!this.selected) {
      return;
    }
    this.dialogRef.close(this.selected);
  }
}
