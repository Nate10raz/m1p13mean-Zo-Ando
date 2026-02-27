import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { BoxEntity, BoxService } from 'src/app/services/box.service';

@Component({
  selector: 'app-box-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './box-detail.component.html',
  styles: [
    `
      .box-header {
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

      .status-pill.free {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .status-pill.occupied {
        background: #ffebee;
        color: #c62828;
      }

      .box-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 20px;
      }

      @media (max-width: 900px) {
        .box-grid {
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
export class AppBoxDetailComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';
  box: BoxEntity | null = null;
  mainImageUrl = '';
  activeImageUrl = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private boxService: BoxService,
    private location: Location,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (!id) {
          this.errorMessage = 'Box introuvable.';
          this.box = null;
          this.cdr.markForCheck();
          return;
        }
        this.loadBox(id);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.location.back();
  }

  selectImage(url: string): void {
    this.activeImageUrl = url;
  }

  formatSurface(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);
    return `${formatted} m2`;
  }

  formatTarif(value: BoxEntity['tarifActuel']): string {
    if (!value?.montant) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
      value.montant,
    );
    const unite = value.unite === 'annee' ? 'annee' : 'mois';
    return `${formatted} Ar / ${unite}`;
  }

  formatDate(value: string | undefined | null): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  }

  getTypeLabel(box: BoxEntity | null): string {
    if (!box) {
      return '-';
    }
    return typeof box.typeId === 'object'
      ? (box.typeId?.nom ?? box.typeId?._id ?? '-')
      : box.typeId;
  }

  getBoutiqueLabel(box: BoxEntity | null): string {
    if (!box?.boutiqueId) {
      return '-';
    }
    return typeof box.boutiqueId === 'object'
      ? (box.boutiqueId?.nom ?? box.boutiqueId?._id ?? '-')
      : box.boutiqueId;
  }

  private loadBox(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.box = null;
    this.cdr.markForCheck();

    this.boxService
      .getBoxById(id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const box = response?.data ?? null;
          if (!box) {
            this.errorMessage = 'Box introuvable.';
            this.box = null;
            return;
          }
          this.box = box;
          this.setupImages(box);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger la box.';
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4000 });
        },
      });
  }

  private setupImages(box: BoxEntity): void {
    const photos = box.photos ?? [];
    this.mainImageUrl = photos[0] ?? '';
    this.activeImageUrl = this.mainImageUrl;
  }
}
