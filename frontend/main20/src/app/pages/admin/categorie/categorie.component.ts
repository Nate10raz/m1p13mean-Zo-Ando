import { CommonModule } from '@angular/common';
import { FlatTreeControl } from '@angular/cdk/tree';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  Subscription,
  switchMap,
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '../../../material.module';
import {
  CategoryCreatePayload,
  CategoryNode,
  CategoryService,
  CategoryTreeData,
  CategoryUpdatePayload,
} from 'src/app/services/category.service';

interface CategorySearchOption {
  id: string;
  label: string;
  slug: string;
  niveau: number;
}

interface AddCategoryDialogData {
  parent: {
    id: string;
    label: string;
  };
}

interface EditCategoryDialogData {
  category: {
    id: string;
    nom: string;
    slug: string;
    isActive: boolean;
    description?: string;
    image?: string;
    icon?: string;
  };
}

interface DeleteCategoryDialogData {
  category: {
    id: string;
    nom: string;
    slug: string;
    childrenCount: number;
  };
}

interface AddCategoryFormValue {
  nom: string;
  slug: string;
  description: string;
  image: string;
  icon: string;
  isActive: boolean;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface CategoryFlatNode {
  _id: string;
  nom: string;
  slug: string;
  niveau: number;
  isActive: boolean;
  level: number;
  expandable: boolean;
  childrenCount: number;
}

@Component({
  selector: 'app-admin-categorie',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './categorie.component.html',
  styles: [
    `
      .category-tree {
        margin-top: 0.5rem;
      }

      .node-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.5rem;
        border-radius: 6px;
      }

      .node-name {
        font-weight: 600;
      }

      .node-slug,
      .node-meta {
        color: #6c757d;
        font-size: 12px;
      }

      .node-status {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        margin-left: 8px;
      }

      .node-badge {
        display: inline-flex;
        align-items: center;
        font-size: 12px;
        color: #6c757d;
        margin-left: 2px !important;
      }

      .node-spacer {
        flex: 1 1 auto;
      }

      .node-meta {
        margin-left: 8px;
      }

      .current-root {
        margin-bottom: 8px;
        color: #5a6a7a;
        font-size: 13px;
      }

      .current-root strong {
        color: #2a3547;
      }

      .node-toggle {
        margin-right: 0.25rem;
      }

      .toggle-spacer {
        display: inline-block;
        width: 40px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppAdminCategorieComponent implements OnInit, OnDestroy {
  searchControl = new FormControl<string | CategorySearchOption>('', { nonNullable: true });
  searchOptions: CategorySearchOption[] = [];
  selectedRoot: CategorySearchOption | null = null;
  isSearching = false;
  actionInProgress = false;
  categories: CategoryNode[] = [];
  treeControl = new FlatTreeControl<CategoryFlatNode>(
    (node) => node.level,
    (node) => node.expandable,
  );
  treeFlattener = new MatTreeFlattener<CategoryNode, CategoryFlatNode>(
    (node, level) => ({
      _id: node._id,
      nom: node.nom,
      slug: node.slug,
      niveau: node.niveau ?? level,
      isActive: node.isActive,
      level: node.niveau ?? level,
      expandable: Array.isArray(node.children) && node.children.length > 0,
      childrenCount: node.children?.length ?? 0,
    }),
    (node) => node.level,
    (node) => node.expandable,
    (node) => node.children ?? [],
  );
  dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
  isLoading = false;
  errorMessage = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private categoryService: CategoryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTree();
    this.subscriptions.add(
      this.searchControl.valueChanges
        .pipe(
          map((value) => (typeof value === 'string' ? value.trim() : value.label.trim())),
          debounceTime(300),
          distinctUntilChanged(),
          switchMap((term) => {
            if (!term || term.length < 2) {
              this.searchOptions = [];
              this.cdr.markForCheck();
              return of<CategorySearchOption[]>([]);
            }

            this.isSearching = true;
            this.cdr.markForCheck();
            return this.categoryService.getCategoryTree({ search: term, page: 1, limit: 20 }).pipe(
              map((response) => this.flattenSearchOptions(response?.data)),
              catchError(() => of<CategorySearchOption[]>([])),
              finalize(() => {
                this.isSearching = false;
                this.cdr.markForCheck();
              }),
            );
          }),
        )
        .subscribe((options) => {
          this.searchOptions = options;
          this.cdr.markForCheck();
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  reload(): void {
    this.loadTree(this.selectedRoot?.id);
  }

  resetRoot(): void {
    this.selectedRoot = null;
    this.searchControl.setValue('', { emitEvent: false });
    this.loadTree();
  }

  onSearchSelect(option: CategorySearchOption): void {
    if (!option) {
      return;
    }
    this.selectedRoot = option;
    this.searchControl.setValue(option, { emitEvent: false });
    this.loadTree(option.id);
  }

  setRootFromNode(node: CategoryFlatNode): void {
    const option: CategorySearchOption = {
      id: node._id,
      label: node.nom,
      slug: node.slug,
      niveau: node.niveau,
    };
    this.selectedRoot = option;
    this.searchControl.setValue(option, { emitEvent: false });
    this.loadTree(option.id);
  }

  displaySearchOption(option: CategorySearchOption | string | null): string {
    if (!option) {
      return '';
    }
    return typeof option === 'string' ? option : option.label;
  }

  get searchText(): string {
    const value = this.searchControl.value;
    return typeof value === 'string' ? value : (value?.label ?? '');
  }

  openAddChildDialog(node: CategoryFlatNode): void {
    if (this.actionInProgress) {
      return;
    }
    const dialogRef = this.dialog.open(AddCategoryDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      data: {
        parent: {
          id: node._id,
          label: node.nom,
        },
      },
    });

    dialogRef.afterClosed().subscribe((payload: CategoryCreatePayload | undefined) => {
      if (!payload) {
        return;
      }
      this.createCategory(payload);
    });
  }

  openEditDialog(node: CategoryFlatNode): void {
    if (this.actionInProgress) {
      return;
    }
    this.actionInProgress = true;
    this.cdr.markForCheck();
    this.categoryService
      .getCategoryById(node._id)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const category = response?.data;
          if (!category) {
            this.snackBar.open('Impossible de charger la categorie.', 'Fermer', { duration: 4000 });
            return;
          }

          const dialogRef = this.dialog.open(EditCategoryDialogComponent, {
            width: '720px',
            maxWidth: '95vw',
            data: {
              category: {
                id: category._id,
                nom: category.nom,
                slug: category.slug,
                isActive: category.isActive,
                description: category.description,
                image: category.image,
                icon: category.icon,
              },
            },
          });

          dialogRef.afterClosed().subscribe((payload: CategoryUpdatePayload | undefined) => {
            if (!payload) {
              return;
            }
            this.updateCategory(node._id, payload);
          });
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Impossible de charger la categorie.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  openDeleteDialog(node: CategoryFlatNode): void {
    if (this.actionInProgress) {
      return;
    }
    if (node.childrenCount > 0) {
      this.snackBar.open(
        'Suppression bloquee: la categorie contient des sous-categories.',
        'Fermer',
        {
          duration: 4000,
        },
      );
      return;
    }
    const dialogRef = this.dialog.open(DeleteCategoryDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: {
        category: {
          id: node._id,
          nom: node.nom,
          slug: node.slug,
          childrenCount: node.childrenCount,
        },
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) {
        return;
      }
      this.deleteCategory(node._id);
    });
  }

  trackById(index: number, node: CategoryFlatNode): string {
    return node._id || String(index);
  }

  hasChild = (_: number, node: CategoryFlatNode): boolean => node.expandable;

  private loadTree(rootId?: string): void {
    const normalizedRoot = rootId?.trim();
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const request$ = this.categoryService
      .getCategoryTree({ rootId: normalizedRoot ? normalizedRoot : undefined })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const payload = response?.data;
          if (!payload) {
            this.categories = [];
            this.dataSource.data = [];
            return;
          }
          this.categories = Array.isArray(payload) ? payload : [payload];
          this.dataSource.data = this.categories;
          this.treeControl.collapseAll();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger les categories.';
          this.categories = [];
          this.dataSource.data = [];
        },
      });

    this.subscriptions.add(request$);
  }

  private createCategory(payload: CategoryCreatePayload): void {
    this.actionInProgress = true;
    this.categoryService
      .createCategory(payload)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Categorie creee';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.loadTree(this.selectedRoot?.id);
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Creation impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private updateCategory(id: string, payload: CategoryUpdatePayload): void {
    this.actionInProgress = true;
    this.categoryService
      .updateCategory(id, payload)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Categorie mise a jour';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.loadTree(this.selectedRoot?.id);
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Mise a jour impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private deleteCategory(id: string): void {
    this.actionInProgress = true;
    this.categoryService
      .deleteCategory(id, true)
      .pipe(
        finalize(() => {
          this.actionInProgress = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Categorie supprimee';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.loadTree(this.selectedRoot?.id);
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Suppression impossible.';
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
        },
      });
  }

  private flattenSearchOptions(
    payload: CategoryTreeData | null | undefined,
  ): CategorySearchOption[] {
    const nodes = this.normalizePayload(payload);
    if (!nodes.length) {
      return [];
    }
    return this.flattenNodes(nodes);
  }

  private normalizePayload(payload: CategoryTreeData | null | undefined): CategoryNode[] {
    if (!payload) {
      return [];
    }
    return Array.isArray(payload) ? payload : [payload];
  }

  private flattenNodes(nodes: CategoryNode[], parentPath: string[] = []): CategorySearchOption[] {
    const results: CategorySearchOption[] = [];

    nodes.forEach((node) => {
      const path = [...parentPath, node.nom];
      results.push({
        id: node._id,
        label: path.join(' > '),
        slug: node.slug,
        niveau: node.niveau,
      });

      if (node.children?.length) {
        results.push(...this.flattenNodes(node.children, path));
      }
    });

    return results;
  }
}

@Component({
  selector: 'app-add-category-dialog',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Ajouter une categorie</h2>
    <div mat-dialog-content>
      <p class="m-b-12">
        Parent: <strong>{{ data.parent.label }}</strong>
      </p>

      <div class="d-flex flex-column gap-12">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Nom</mat-label>
          <input matInput [formControl]="nomControl" placeholder="Ex: Accessoires" />
          @if (nomControl.hasError('required')) {
            <mat-error>Le nom est obligatoire.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Slug</mat-label>
          <input matInput [formControl]="slugControl" placeholder="Ex: accessoires" />
          @if (slugControl.hasError('required')) {
            <mat-error>Le slug est obligatoire.</mat-error>
          }
          @if (slugControl.hasError('pattern')) {
            <mat-error>Utilise des minuscules, chiffres et tirets.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Description</mat-label>
          <textarea matInput [formControl]="descriptionControl" rows="3"></textarea>
        </mat-form-field>

        <div class="d-flex flex-wrap gap-12">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Image</mat-label>
            <input matInput [formControl]="imageControl" placeholder="URL image" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Icone</mat-label>
            <input matInput [formControl]="iconControl" placeholder="Ex: category" />
          </mat-form-field>
        </div>

        <mat-slide-toggle [formControl]="isActiveControl">Actif</mat-slide-toggle>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="primary" [disabled]="formInvalid" (click)="onSubmit()">
        Creer
      </button>
    </div>
  `,
})
export class AddCategoryDialogComponent {
  nomControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  slugControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(slugPattern)],
  });
  descriptionControl = new FormControl('', { nonNullable: true });
  imageControl = new FormControl('', { nonNullable: true });
  iconControl = new FormControl('', { nonNullable: true });
  isActiveControl = new FormControl(true, { nonNullable: true });

  constructor(
    private dialogRef: MatDialogRef<AddCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddCategoryDialogData,
  ) {}

  get formInvalid(): boolean {
    return this.nomControl.invalid || this.slugControl.invalid;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.formInvalid) {
      this.nomControl.markAsTouched();
      this.slugControl.markAsTouched();
      return;
    }

    const payload: CategoryCreatePayload = {
      nom: this.nomControl.value.trim(),
      slug: this.slugControl.value.trim(),
      description: this.descriptionControl.value.trim() || undefined,
      image: this.imageControl.value.trim() || undefined,
      icon: this.iconControl.value.trim() || undefined,
      isActive: this.isActiveControl.value,
      parentId: this.data.parent.id,
    };

    this.dialogRef.close(payload);
  }
}

@Component({
  selector: 'app-edit-category-dialog',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Modifier la categorie</h2>
    <div mat-dialog-content>
      <p class="m-b-12">
        Categorie: <strong>{{ data.category.nom }}</strong>
      </p>

      <div class="d-flex flex-column gap-12">
        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Nom</mat-label>
          <input matInput [formControl]="nomControl" />
          @if (nomControl.hasError('required')) {
            <mat-error>Le nom est obligatoire.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Slug</mat-label>
          <input matInput [formControl]="slugControl" />
          @if (slugControl.hasError('required')) {
            <mat-error>Le slug est obligatoire.</mat-error>
          }
          @if (slugControl.hasError('pattern')) {
            <mat-error>Utilise des minuscules, chiffres et tirets.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Description</mat-label>
          <textarea matInput [formControl]="descriptionControl" rows="3"></textarea>
        </mat-form-field>

        <div class="d-flex flex-wrap gap-12">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Image</mat-label>
            <input matInput [formControl]="imageControl" placeholder="URL image" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Icone</mat-label>
            <input matInput [formControl]="iconControl" placeholder="Ex: category" />
          </mat-form-field>
        </div>

        <mat-slide-toggle [formControl]="isActiveControl">Actif</mat-slide-toggle>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="primary" [disabled]="formInvalid" (click)="onSubmit()">
        Enregistrer
      </button>
    </div>
  `,
})
export class EditCategoryDialogComponent {
  nomControl = new FormControl(this.data.category.nom, {
    nonNullable: true,
    validators: [Validators.required],
  });
  slugControl = new FormControl(this.data.category.slug, {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(slugPattern)],
  });
  descriptionControl = new FormControl(this.data.category.description ?? '', {
    nonNullable: true,
  });
  imageControl = new FormControl(this.data.category.image ?? '', { nonNullable: true });
  iconControl = new FormControl(this.data.category.icon ?? '', { nonNullable: true });
  isActiveControl = new FormControl(this.data.category.isActive, { nonNullable: true });

  constructor(
    private dialogRef: MatDialogRef<EditCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditCategoryDialogData,
  ) {}

  get formInvalid(): boolean {
    return this.nomControl.invalid || this.slugControl.invalid;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.formInvalid) {
      this.nomControl.markAsTouched();
      this.slugControl.markAsTouched();
      return;
    }

    const description = this.descriptionControl.value.trim();
    const image = this.imageControl.value.trim();
    const icon = this.iconControl.value.trim();

    const payload: CategoryUpdatePayload = {
      nom: this.nomControl.value.trim(),
      slug: this.slugControl.value.trim(),
      description: description.length ? description : undefined,
      image: image.length ? image : undefined,
      icon: icon.length ? icon : undefined,
      isActive: this.isActiveControl.value,
    };

    this.dialogRef.close(payload);
  }
}

@Component({
  selector: 'app-delete-category-dialog',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Supprimer la categorie</h2>
    <div mat-dialog-content>
      <p class="m-b-12">
        Tu es sur le point de supprimer <strong>{{ data.category.nom }}</strong
        >.
      </p>
      <p class="text-error m-b-12">Cette action est irreversible.</p>
      @if (data.category.childrenCount > 0) {
        <p class="text-warning m-b-12">
          Cette categorie contient {{ data.category.childrenCount }} sous-categorie(s).
        </p>
      }

      <mat-checkbox [formControl]="confirmCheck"> Je confirme la suppression </mat-checkbox>

      <mat-form-field appearance="outline" class="w-100 m-t-12">
        <mat-label>Slug a confirmer</mat-label>
        <input matInput [formControl]="slugControl" placeholder="{{ data.category.slug }}" />
        @if (slugControl.hasError('required')) {
          <mat-error>Le slug est obligatoire.</mat-error>
        }
        @if (slugControl.hasError('mismatch')) {
          <mat-error>Le slug ne correspond pas.</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Mot-cle de confirmation</mat-label>
        <input matInput [formControl]="keywordControl" placeholder="SUPPRIMER" />
        @if (keywordControl.hasError('required')) {
          <mat-error>Le mot-cle est obligatoire.</mat-error>
        }
        @if (keywordControl.hasError('mismatch')) {
          <mat-error>Le mot-cle ne correspond pas.</mat-error>
        }
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Annuler</button>
      <button mat-flat-button color="warn" [disabled]="formInvalid" (click)="onConfirm()">
        Supprimer
      </button>
    </div>
  `,
})
export class DeleteCategoryDialogComponent {
  confirmCheck = new FormControl(false, { nonNullable: true });
  slugControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  keywordControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  constructor(
    private dialogRef: MatDialogRef<DeleteCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteCategoryDialogData,
  ) {}

  get formInvalid(): boolean {
    return (
      !this.confirmCheck.value ||
      this.slugControl.invalid ||
      this.keywordControl.invalid ||
      this.slugMismatch ||
      this.keywordMismatch
    );
  }

  private get slugMismatch(): boolean {
    return this.slugControl.value.trim() !== this.data.category.slug;
  }

  private get keywordMismatch(): boolean {
    return this.keywordControl.value.trim() !== 'SUPPRIMER';
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (this.formInvalid) {
      this.slugControl.markAsTouched();
      this.keywordControl.markAsTouched();
      this.slugControl.setErrors({ mismatch: this.slugMismatch || null });
      this.keywordControl.setErrors({ mismatch: this.keywordMismatch || null });
      return;
    }

    this.dialogRef.close(true);
  }
}
