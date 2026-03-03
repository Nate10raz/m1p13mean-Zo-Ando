import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged, finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import {
  BoutiqueInventoryItem,
  BoutiqueStockBulkAdjustPayload,
  BoutiqueStockImportItem,
  BoutiqueStockMovementItem,
  BoutiqueStockMovementQuery,
  BoutiqueService,
} from 'src/app/services/boutique.service';
import { CategoryNode, CategoryService } from 'src/app/services/category.service';

type StockMovementType = 'ajout' | 'retrait' | 'ajustement';

interface InventoryRow {
  id: number;
  productId: string;
  image: string;
  titre: string;
  slug: string;
  stock: number;
  stockPhysiqueInput: number | null;
  pendingDelta: number | null;
  hasPendingAdjustment: boolean;
  seuil: number | null;
  isLowStock: boolean;
  estActif: boolean;
  lastMovementAt: Date | null;
  isUpdating: boolean;
}

interface MovementDialogResult {
  quantite?: number;
  stockPhysique?: number;
  raison?: string;
}

@Component({
  selector: 'app-boutique-inventaire',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
  ],
  templateUrl: './inventaire.component.html',
  styleUrls: ['./inventaire.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoutiqueInventaireComponent implements OnInit, OnDestroy {
  private readonly baseColumns: string[] = [
    'produit',
    'stock',
    'seuil',
    'alerte',
    'statut',
    'mouvement',
    'actions',
  ];
  displayedColumns: string[] = [...this.baseColumns];
  dataSource: InventoryRow[] = [];
  isLoading = false;
  errorMessage = '';
  total = 0;
  page = 1;
  limit = 20;
  isBulkSaving = false;
  pendingAdjustmentsCount = 0;
  isGlobalExporting = false;
  isParsingImport = false;
  isImporting = false;
  importFileName = '';
  importTotalRows = 0;
  importValidRows = 0;
  importSkippedRows = 0;
  importErrors: string[] = [];
  importItems: BoutiqueStockImportItem[] = [];

  categories: CategoryNode[] = [];
  isLoadingCategories = false;

  searchControl = new FormControl('', { nonNullable: true });
  lowStockControl = new FormControl(false, { nonNullable: true });
  categoryControl = new FormControl<string | null>(null);
  statusControl = new FormControl<'all' | 'active' | 'inactive'>('all', { nonNullable: true });
  rapidModeControl = new FormControl(false, { nonNullable: true });
  exportTypeControl = new FormControl<
    'all' | 'ajout' | 'retrait' | 'commande' | 'ajustement' | 'retour' | 'defectueux'
  >('all', { nonNullable: true });
  exportStartDateControl = new FormControl('');
  exportEndDateControl = new FormControl('');

  get canImport(): boolean {
    return (
      !this.isImporting &&
      !this.isParsingImport &&
      this.importValidRows > 0 &&
      this.importErrors.length === 0
    );
  }

  private readonly subscriptions = new Subscription();

  constructor(
    private boutiqueService: BoutiqueService,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.fetchInventory();

    this.subscriptions.add(
      this.searchControl.valueChanges
        .pipe(debounceTime(350), distinctUntilChanged())
        .subscribe(() => {
          this.page = 1;
          this.fetchInventory();
        }),
    );

    this.subscriptions.add(
      this.lowStockControl.valueChanges.subscribe(() => {
        this.page = 1;
        this.fetchInventory();
      }),
    );

    this.subscriptions.add(
      this.categoryControl.valueChanges.subscribe(() => {
        this.page = 1;
        this.fetchInventory();
      }),
    );

    this.subscriptions.add(
      this.statusControl.valueChanges.subscribe(() => {
        this.page = 1;
        this.fetchInventory();
      }),
    );

    this.subscriptions.add(
      this.rapidModeControl.valueChanges.subscribe((enabled) => {
        this.updateDisplayedColumns(enabled);
        if (!enabled) {
          this.resetRapidAdjustments();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.fetchInventory();
  }

  reload(): void {
    this.fetchInventory();
  }

  openMovementDialog(row: InventoryRow, type: StockMovementType): void {
    const dialogRef = this.dialog.open(InventoryMovementDialogComponent, {
      width: '420px',
      data: { type, product: row },
    });

    dialogRef.afterClosed().subscribe((result: MovementDialogResult | undefined) => {
      if (!result) return;
      this.applyMovement(row, type, result);
    });
  }

  openHistoryDialog(row: InventoryRow): void {
    this.dialog.open(InventoryHistoryDialogComponent, {
      width: '820px',
      data: { product: row },
    });
  }

  onPhysicalStockInput(row: InventoryRow, rawValue: string): void {
    if (!this.rapidModeControl.value) return;
    if (rawValue === '') {
      row.stockPhysiqueInput = null;
      row.pendingDelta = null;
      row.hasPendingAdjustment = false;
      this.updatePendingCount();
      this.cdr.markForCheck();
      return;
    }
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed) || parsed < 0) {
      row.stockPhysiqueInput = null;
      row.pendingDelta = null;
      row.hasPendingAdjustment = false;
      this.updatePendingCount();
      this.cdr.markForCheck();
      return;
    }
    const value = Math.floor(parsed);
    row.stockPhysiqueInput = value;
    row.pendingDelta = value - row.stock;
    row.hasPendingAdjustment = row.pendingDelta !== 0;
    this.updatePendingCount();
    this.cdr.markForCheck();
  }

  saveRapidAdjustments(): void {
    if (this.isBulkSaving || !this.pendingAdjustmentsCount) {
      return;
    }
    const items = this.dataSource
      .filter((row) => row.hasPendingAdjustment)
      .map((row) => ({
        produitId: row.productId,
        stockPhysique: row.stockPhysiqueInput ?? row.stock,
        raison: 'Inventaire rapide',
      }));

    if (!items.length) {
      this.snackBar.open('Aucun ajustement a enregistrer', 'Fermer', { duration: 3000 });
      return;
    }

    const payload: BoutiqueStockBulkAdjustPayload = { items };
    this.isBulkSaving = true;
    this.cdr.markForCheck();

    this.subscriptions.add(
      this.boutiqueService
        .bulkStockAdjustments(payload)
        .pipe(
          finalize(() => {
            this.isBulkSaving = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (res) => {
            const summary = res.data;
            const message = summary
              ? `Inventaire rapide: ${summary.updated} mis a jour, ${summary.skipped} inchanges, ${summary.failed} erreurs`
              : 'Inventaire rapide enregistre';
            this.snackBar.open(message, 'Fermer', { duration: 4000 });
            this.fetchInventory();
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || "Erreur lors de l'enregistrement de l'inventaire rapide",
              'Fermer',
              { duration: 4000 },
            );
          },
        }),
    );
  }

  exportGlobalCsv(): void {
    if (this.isGlobalExporting) return;
    const search = this.normalizeSearch(this.searchControl.value);
    const statusValue = this.statusControl.value;
    const estActif = statusValue === 'all' ? undefined : statusValue === 'active';
    const exportTypeValue = this.exportTypeControl.value;
    const type = exportTypeValue === 'all' ? undefined : exportTypeValue;
    const startDate = this.exportStartDateControl.value || undefined;
    const endDate = this.exportEndDateControl.value || undefined;

    this.isGlobalExporting = true;
    this.cdr.markForCheck();
    this.subscriptions.add(
      this.boutiqueService
        .exportStockMovementsGlobalCsv({
          search: search || undefined,
          categorieId: this.categoryControl.value || undefined,
          estActif,
          type,
          startDate,
          endDate,
          limit: 10000,
        })
        .pipe(
          finalize(() => {
            this.isGlobalExporting = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (blob) => {
            const today = new Date().toISOString().slice(0, 10);
            this.downloadBlob(blob, `mouvements-boutique-${today}.csv`);
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || "Erreur lors de l'export CSV global",
              'Fermer',
              { duration: 4000 },
            );
          },
        }),
    );
  }

  downloadImportTemplate(): void {
    const header = ['produit', 'sku', 'stockPhysique', 'raison', 'reference'].join(',');
    const csv = `\ufeff${header}\r\n`;
    this.downloadBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      'template-inventaire.csv',
    );
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importFileName = file.name;
    this.isParsingImport = true;
    this.importErrors = [];
    this.importItems = [];
    this.importTotalRows = 0;
    this.importValidRows = 0;
    this.importSkippedRows = 0;
    this.cdr.markForCheck();

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      this.parseImportCsv(text);
      this.isParsingImport = false;
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.importErrors = ["Erreur lors de la lecture du fichier"];
      this.isParsingImport = false;
      this.cdr.markForCheck();
    };
    reader.readAsText(file);

    input.value = '';
  }

  importCsv(): void {
    if (!this.canImport) return;
    this.isImporting = true;
    this.cdr.markForCheck();

    this.subscriptions.add(
      this.boutiqueService
        .importStockCsv({ items: this.importItems })
        .pipe(
          finalize(() => {
            this.isImporting = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (res) => {
            const summary = res.data;
            this.snackBar.open(
              summary ? `Import rÃ©ussi: ${summary.updated} produit(s) mis Ã  jour` : 'Import rÃ©ussi',
              'Fermer',
              { duration: 4000 },
            );
            this.fetchInventory();
          },
          error: (err) => {
            const dataErrors = err?.error?.data?.errors;
            if (Array.isArray(dataErrors) && dataErrors.length) {
              this.importErrors = dataErrors.map(
                (e: any) => `Ligne ${e.row}: ${e.message}`,
              );
            } else {
              this.importErrors = [
                err?.error?.message || "Erreur lors de l'import CSV",
              ];
            }
          },
        }),
    );
  }

  trackByProductId(index: number, row: InventoryRow): string {
    return row.productId || String(index);
  }

  private loadCategories(): void {
    this.isLoadingCategories = true;
    this.subscriptions.add(
      this.categoryService
        .listCategories()
        .pipe(
          finalize(() => {
            this.isLoadingCategories = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (res) => {
            const list = res.data ?? [];
            this.categories = list.sort((a, b) => a.nom.localeCompare(b.nom));
          },
          error: () => {
            this.categories = [];
          },
        }),
    );
  }

  private updateDisplayedColumns(rapidMode: boolean): void {
    if (rapidMode) {
      this.displayedColumns = [
        'produit',
        'stock',
        'stockPhysique',
        'seuil',
        'alerte',
        'statut',
        'mouvement',
        'actions',
      ];
    } else {
      this.displayedColumns = [...this.baseColumns];
    }
    this.cdr.markForCheck();
  }

  private resetRapidAdjustments(): void {
    this.dataSource = this.dataSource.map((row) => ({
      ...row,
      stockPhysiqueInput: null,
      pendingDelta: null,
      hasPendingAdjustment: false,
    }));
    this.pendingAdjustmentsCount = 0;
    this.cdr.markForCheck();
  }

  private updatePendingCount(): void {
    this.pendingAdjustmentsCount = this.dataSource.filter((row) => row.hasPendingAdjustment).length;
  }

  private fetchInventory(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const search = this.normalizeSearch(this.searchControl.value);
    const lowStock = this.lowStockControl.value;
    const categorieId = this.categoryControl.value || undefined;
    const statusValue = this.statusControl.value;
    const estActif =
      statusValue === 'all' ? undefined : statusValue === 'active';

    this.subscriptions.add(
      this.boutiqueService
        .getBoutiqueInventory({
          page: this.page,
          limit: this.limit,
          search: search || undefined,
          lowStock,
          categorieId,
          estActif,
        })
        .pipe(
          finalize(() => {
            this.isLoading = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (res) => {
            const data = res.data;
            const items = data?.items ?? [];
            this.dataSource = items.map((item, index) => this.mapItem(item, index));
            this.total = data?.total ?? 0;
            this.page = data?.page ?? this.page;
            this.limit = data?.limit ?? this.limit;
            this.pendingAdjustmentsCount = 0;
          },
          error: (err) => {
            this.errorMessage = err?.error?.message || "Erreur lors du chargement de l'inventaire";
            this.dataSource = [];
            this.total = 0;
          },
        }),
    );
  }

  private applyMovement(row: InventoryRow, type: StockMovementType, payload: MovementDialogResult): void {
    row.isUpdating = true;
    this.cdr.markForCheck();

    this.subscriptions.add(
      this.boutiqueService
        .createStockMovement({
          produitId: row.productId,
          type,
          quantite: payload.quantite,
          stockPhysique: payload.stockPhysique,
          raison: payload.raison,
        })
        .pipe(
          finalize(() => {
            row.isUpdating = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            this.snackBar.open('Stock mis a jour', 'Fermer', { duration: 3000 });
            this.fetchInventory();
          },
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || "Erreur lors de la mise a jour du stock",
              'Fermer',
              { duration: 4000 },
            );
          },
        }),
    );
  }

  private normalizeSearch(value: string): string {
    return String(value || '').trim();
  }

  private mapItem(item: BoutiqueInventoryItem, index: number): InventoryRow {
    return {
      id: index + 1,
      productId: item._id,
      image: this.resolveImage(item),
      titre: item.titre || 'Produit',
      slug: item.slug || item.sku || '-',
      stock: typeof item.stockTheorique === 'number' ? item.stockTheorique : 0,
      stockPhysiqueInput: null,
      pendingDelta: null,
      hasPendingAdjustment: false,
      seuil: item.seuilAlerte ?? null,
      isLowStock: Boolean(item.isLowStock),
      estActif: item.estActif !== false,
      lastMovementAt: item.lastMovementAt ? new Date(item.lastMovementAt) : null,
      isUpdating: false,
    };
  }

  private resolveImage(item: BoutiqueInventoryItem): string {
    const images = Array.isArray(item.images) ? item.images : [];
    const main = images.find(
      (img: any) => typeof img === 'object' && img && (img as any).isMain,
    ) as any;
    if (main?.url) return main.url;
    const first = images[0] as any;
    if (typeof first === 'string') return first;
    if (first?.url) return first.url;
    return 'assets/images/products/product-1.png';
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private parseImportCsv(text: string): void {
    this.importItems = [];
    this.importErrors = [];
    this.importTotalRows = 0;
    this.importValidRows = 0;
    this.importSkippedRows = 0;
    const delimiter = this.detectCsvDelimiter(text);
    const rows = this.parseCsv(text, delimiter);
    if (!rows.length) {
      this.importErrors = ['Fichier CSV vide'];
      return;
    }

    const expectedHeaders = ['produit', 'sku', 'stockPhysique', 'raison', 'reference'];
    const legacyHeaders = ['produitId', 'sku', 'stockPhysique', 'raison', 'reference'];
    const headers = rows.shift() || [];
    let normalizedHeaders = headers.map((h, index) => {
      const value = String(h || '').replace(/\ufeff/g, '').trim();
      return index === 0 ? value : value;
    });
    while (normalizedHeaders.length && normalizedHeaders[normalizedHeaders.length - 1] === '') {
      normalizedHeaders.pop();
    }
    const matchesExpected =
      normalizedHeaders.length === expectedHeaders.length &&
      normalizedHeaders.every(
        (header, idx) => header.toLowerCase() === expectedHeaders[idx].toLowerCase(),
      );
    const matchesLegacy =
      normalizedHeaders.length === legacyHeaders.length &&
      normalizedHeaders.every(
        (header, idx) => header.toLowerCase() === legacyHeaders[idx].toLowerCase(),
      );

    if (!matchesExpected && !matchesLegacy) {
      this.importErrors = [
        `Format CSV invalide. EntÃªtes attendues: ${expectedHeaders.join(', ')}`,
      ];
      return;
    }

    const useLegacy = matchesLegacy && !matchesExpected;

    const items: BoutiqueStockImportItem[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      let cells = [...row];
      while (cells.length && String(cells[cells.length - 1] ?? '').trim() === '') {
        cells = cells.slice(0, -1);
      }
      while (cells.length < expectedHeaders.length) cells.push('');
      if (cells.length > expectedHeaders.length) {
        errors.push(`Ligne ${rowNumber}: trop de colonnes`);
        return;
      }

      const firstValue = String(cells[0] || '').trim();
      const produitId = useLegacy ? firstValue : '';
      const produit = useLegacy ? '' : firstValue;
      const sku = String(cells[1] || '').trim();
      const stockPhysiqueRaw = String(cells[2] || '').trim();
      const raison = String(cells[3] || '').trim();
      const reference = String(cells[4] || '').trim();

      const isRowEmpty = [produitId, produit, sku, stockPhysiqueRaw, raison, reference].every(
        (value) => value === '',
      );
      if (isRowEmpty) {
        this.importSkippedRows += 1;
        return;
      }

      if (!produitId && !produit && !sku) {
        errors.push(`Ligne ${rowNumber}: produit ou sku requis`);
        return;
      }

      if (produitId && !/^[a-fA-F0-9]{24}$/.test(produitId)) {
        errors.push(`Ligne ${rowNumber}: produitId invalide`);
        return;
      }

      if (!stockPhysiqueRaw) {
        errors.push(`Ligne ${rowNumber}: stockPhysique requis`);
        return;
      }

      const stockPhysique = Number(stockPhysiqueRaw);
      if (!Number.isInteger(stockPhysique) || stockPhysique < 0) {
        errors.push(`Ligne ${rowNumber}: stockPhysique invalide`);
        return;
      }

      const key = produitId || (sku ? `sku:${sku}` : `produit:${produit.toLowerCase()}`);
      if (seen.has(key)) {
        errors.push(`Ligne ${rowNumber}: produit dupliquÃ©`);
        return;
      }
      seen.add(key);

      items.push({
        produitId: produitId || undefined,
        produit: produit || undefined,
        sku: sku || undefined,
        stockPhysique,
        raison: raison || undefined,
        reference: reference || undefined,
      });
    });

    this.importItems = items;
    this.importErrors = errors;
    this.importTotalRows = rows.length;
    this.importValidRows = items.length;
  }

  private parseCsv(text: string, delimiter: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    const pushField = () => {
      row.push(field);
      field = '';
    };

    const pushRow = () => {
      rows.push(row);
      row = [];
    };

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        pushField();
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i += 1;
        }
        pushField();
        pushRow();
        continue;
      }

      field += char;
    }

    pushField();
    if (row.length) {
      pushRow();
    }

    return rows;
  }

  private detectCsvDelimiter(text: string): string {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (!lines.length) return ',';
    const sample = lines[0];
    const counts = {
      ',': (sample.match(/,/g) || []).length,
      ';': (sample.match(/;/g) || []).length,
      '\t': (sample.match(/\t/g) || []).length,
    };
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0][1] > 0 ? sorted[0][0] : ',';
  }
}

@Component({
  selector: 'app-inventory-movement-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title class="f-w-600 f-s-18">{{ title }}</h2>
    <div mat-dialog-content class="m-t-4">
      <div class="text-muted f-s-12 m-b-16">
        <div class="f-w-600 text-dark">{{ data.product.titre }}</div>
        <div>Stock actuel : {{ data.product.stock }}</div>
      </div>

      <form [formGroup]="form" class="d-flex flex-column gap-12">
        @if (isAjustement) {
          <mat-form-field appearance="outline">
            <mat-label>Stock physique</mat-label>
            <input matInput type="number" formControlName="stockPhysique" min="0" />
            <mat-hint>Entrez le stock réellement constaté.</mat-hint>
          </mat-form-field>
          @if (stockPhysiqueDelta !== null) {
            <div class="f-s-12 text-muted">
              Écart : {{ stockPhysiqueDelta > 0 ? '+' : '' }}{{ stockPhysiqueDelta }}
            </div>
          }
        } @else {
          <mat-form-field appearance="outline">
            <mat-label>Quantité</mat-label>
            <input matInput type="number" formControlName="quantite" min="1" />
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Raison (optionnel)</mat-label>
          <textarea matInput formControlName="raison" rows="2"></textarea>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions align="end" class="p-b-16 p-r-16">
      <button mat-button [mat-dialog-close]="null">Annuler</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">
        Valider
      </button>
    </div>
  `,
})
export class InventoryMovementDialogComponent {
  form = this.fb.group({
    quantite: [1, [Validators.required, Validators.min(1)]],
    stockPhysique: [0, [Validators.required, Validators.min(0)]],
    raison: [''],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { type: StockMovementType; product: InventoryRow },
    private dialogRef: MatDialogRef<InventoryMovementDialogComponent>,
    private fb: FormBuilder,
  ) {
    if (this.isAjustement) {
      this.form.get('quantite')?.disable();
      this.form.patchValue({ stockPhysique: data.product.stock });
    } else {
      this.form.get('stockPhysique')?.disable();
    }
  }

  get isAjustement(): boolean {
    return this.data.type === 'ajustement';
  }

  get title(): string {
    if (this.data.type === 'ajout') return 'Ajouter du stock';
    if (this.data.type === 'retrait') return 'Retirer du stock';
    return 'Inventaire - ajustement';
  }

  get stockPhysiqueDelta(): number | null {
    if (!this.isAjustement) return null;
    const value = this.form.get('stockPhysique')?.value;
    if (value === null || value === undefined) return null;
    const delta = Number(value) - this.data.product.stock;
    return Number.isNaN(delta) ? null : delta;
  }

  submit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const payload: MovementDialogResult = this.isAjustement
      ? {
          stockPhysique: value.stockPhysique ?? 0,
          raison: value.raison || undefined,
        }
      : {
          quantite: value.quantite ?? 1,
          raison: value.raison || undefined,
        };
    this.dialogRef.close(payload);
  }
}

@Component({
  selector: 'app-inventory-history-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, MatTableModule, MatPaginatorModule],
  template: `
    <h2 mat-dialog-title class="f-w-600 f-s-18">Historique des mouvements</h2>
    <div mat-dialog-content class="m-t-4">
      <div class="text-muted f-s-12 m-b-16">
        <div class="f-w-600 text-dark">{{ data.product.titre }}</div>
        <div>Stock actuel : {{ data.product.stock }}</div>
      </div>

      <form [formGroup]="filtersForm" class="d-flex flex-wrap gap-12 align-items-end m-b-16">
        <mat-form-field appearance="outline" class="min-w-160">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            <mat-option value="all">Tous</mat-option>
            @for (opt of movementTypeOptions; track opt.value) {
              <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="min-w-160">
          <mat-label>Du</mat-label>
          <input matInput type="date" formControlName="startDate" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="min-w-160">
          <mat-label>Au</mat-label>
          <input matInput type="date" formControlName="endDate" />
        </mat-form-field>
        <button mat-stroked-button type="button" (click)="reload()" [disabled]="isLoading">
          Actualiser
        </button>
        <button mat-flat-button color="primary" type="button" (click)="exportCsv()" [disabled]="isExporting">
          Exporter CSV
        </button>
      </form>

      @if (isLoading) {
        <div class="p-16">Chargement en cours...</div>
      } @else if (errorMessage) {
        <div class="p-16 text-error">{{ errorMessage }}</div>
      } @else if (!items.length) {
        <div class="p-16 text-muted">Aucun mouvement trouvÃ©.</div>
      } @else {
        <div class="table-responsive">
          <table mat-table [dataSource]="items" class="w-100">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef class="f-w-600 f-s-14">Date</th>
              <td mat-cell *matCellDef="let element">
                <span class="f-s-12">{{ element.createdAt | date: 'short' }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef class="f-w-600 f-s-14">Type</th>
              <td mat-cell *matCellDef="let element">{{ getTypeLabel(element.type) }}</td>
            </ng-container>

            <ng-container matColumnDef="quantite">
              <th mat-header-cell *matHeaderCellDef class="f-w-600 f-s-14">QuantitÃ©</th>
              <td mat-cell *matCellDef="let element">
                <span [class.text-success]="getSignedQuantity(element) > 0" [class.text-error]="getSignedQuantity(element) < 0">
                  {{ getSignedQuantity(element) > 0 ? '+' : '' }}{{ getSignedQuantity(element) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="stockAvant">
              <th mat-header-cell *matHeaderCellDef class="f-w-600 f-s-14">Avant</th>
              <td mat-cell *matCellDef="let element">{{ element.stockAvant }}</td>
            </ng-container>

            <ng-container matColumnDef="stockApres">
              <th mat-header-cell *matHeaderCellDef class="f-w-600 f-s-14">AprÃ¨s</th>
              <td mat-cell *matCellDef="let element">{{ element.stockApres }}</td>
            </ng-container>

            <ng-container matColumnDef="reference">
              <th mat-header-cell *matHeaderCellDef class="f-w-600 f-s-14">RÃ©f.</th>
              <td mat-cell *matCellDef="let element">{{ element.reference || '-' }}</td>
            </ng-container>

            <ng-container matColumnDef="raison">
              <th mat-header-cell *matHeaderCellDef class="f-w-600 f-s-14">Raison</th>
              <td mat-cell *matCellDef="let element">{{ element.raison || '-' }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>

        <mat-paginator
          class="m-t-16"
          [length]="total"
          [pageIndex]="page - 1"
          [pageSize]="limit"
          [pageSizeOptions]="[10, 20, 50, 100]"
          [showFirstLastButtons]="true"
          (page)="onPageChange($event)"
        >
        </mat-paginator>
      }
    </div>
    <div mat-dialog-actions align="end" class="p-b-16 p-r-16">
      <button mat-button mat-dialog-close>Fermer</button>
    </div>
  `,
  styles: [
    `
      .table-responsive {
        overflow: auto;
      }
      .min-w-160 {
        min-width: 160px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryHistoryDialogComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = [
    'date',
    'type',
    'quantite',
    'stockAvant',
    'stockApres',
    'reference',
    'raison',
  ];
  items: BoutiqueStockMovementItem[] = [];
  page = 1;
  limit = 20;
  total = 0;
  isLoading = false;
  isExporting = false;
  errorMessage = '';

  filtersForm = this.fb.group({
    type: ['all'],
    startDate: [''],
    endDate: [''],
  });

  movementTypeOptions = [
    { value: 'ajout', label: 'Ajout' },
    { value: 'retrait', label: 'Retrait' },
    { value: 'commande', label: 'Commande' },
    { value: 'ajustement', label: 'Ajustement' },
    { value: 'retour', label: 'Retour' },
    { value: 'defectueux', label: 'DÃ©fectueux' },
  ];

  private readonly subs = new Subscription();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { product: InventoryRow },
    private boutiqueService: BoutiqueService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.fetchMovements();
    this.subs.add(
      this.filtersForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
        this.page = 1;
        this.fetchMovements();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  reload(): void {
    this.fetchMovements();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.limit = event.pageSize;
    this.fetchMovements();
  }

  exportCsv(): void {
    if (this.isExporting) return;
    const query = this.buildQuery(5000);
    this.isExporting = true;
    this.cdr.markForCheck();
    this.subs.add(
      this.boutiqueService
        .exportStockMovementsCsv(query)
        .pipe(
          finalize(() => {
            this.isExporting = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (blob) => this.downloadBlob(blob),
          error: (err) => {
            this.snackBar.open(
              err?.error?.message || "Erreur lors de l'export CSV",
              'Fermer',
              { duration: 4000 },
            );
          },
        }),
    );
  }

  getTypeLabel(type: BoutiqueStockMovementItem['type']): string {
    const found = this.movementTypeOptions.find((opt) => opt.value === type);
    return found?.label || type;
  }

  getSignedQuantity(item: BoutiqueStockMovementItem): number {
    const negativeTypes = new Set(['retrait', 'commande', 'defectueux']);
    const value = Number(item.quantite || 0);
    return negativeTypes.has(item.type) ? -value : value;
  }

  private fetchMovements(): void {
    this.isLoading = true;
    this.errorMessage = '';
    const query = this.buildQuery();
    this.subs.add(
      this.boutiqueService
        .getStockMovements(query)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (res) => {
            const data = res.data;
            this.items = data?.items ?? [];
            this.total = data?.total ?? 0;
            this.page = data?.page ?? this.page;
            this.limit = data?.limit ?? this.limit;
          },
          error: (err) => {
            this.errorMessage =
              err?.error?.message || "Erreur lors du chargement de l'historique";
            this.items = [];
            this.total = 0;
          },
        }),
    );
  }

  private buildQuery(limitOverride?: number): BoutiqueStockMovementQuery {
    const values = this.filtersForm.getRawValue();
    const type = values.type === 'all' ? undefined : (values.type as BoutiqueStockMovementItem['type']);
    const query: BoutiqueStockMovementQuery = {
      produitId: this.data.product.productId,
      page: this.page,
      limit: limitOverride ?? this.limit,
      type,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    };
    return query;
  }

  private downloadBlob(blob: Blob): void {
    const safeName = String(this.data.product.slug || this.data.product.titre || 'produit')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const fileName = `mouvements-${safeName || this.data.product.productId}.csv`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
