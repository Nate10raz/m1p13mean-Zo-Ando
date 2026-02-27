import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { BoxEntity, BoxService, BoxTarifPayload } from 'src/app/services/box.service';

@Component({
  selector: 'app-box-tarif',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule],
  templateUrl: './box-tarif.component.html',
  styles: [
    `
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBoxTarifComponent implements OnInit, OnDestroy {
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  serverError = '';
  box: BoxEntity | null = null;
  private boxId = '';

  form = this.fb.group({
    montant: [null as number | null, [Validators.required, Validators.min(0)]],
    unite: this.fb.control<'mois' | 'annee'>('mois', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dateDebut: ['', Validators.required],
    raison: [''],
  });

  private readonly subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private boxService: BoxService,
    private snackBar: MatSnackBar,
    private location: Location,
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
        this.boxId = id;
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.isSubmitting = true;
    this.serverError = '';
    this.cdr.markForCheck();

    this.boxService
      .updateBoxTarif(this.boxId, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const updatedTarif = response?.data?.tarifActuel ?? {
            montant: payload.montant,
            unite: payload.unite,
            dateDebut: payload.dateDebut,
          };
          this.box = this.box
            ? { ...this.box, tarifActuel: updatedTarif }
            : (response?.data ?? null);
          const tarifLabel = this.formatTarif(updatedTarif);
          const dateLabel = this.formatDate(updatedTarif.dateDebut);
          const message =
            dateLabel !== '-'
              ? `Tarif mis a jour: ${tarifLabel} (a partir du ${dateLabel})`
              : `Tarif mis a jour: ${tarifLabel}`;
          this.snackBar.open(message, 'Fermer', { duration: 4000 });
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.serverError = error?.error?.message ?? 'Mise a jour impossible.';
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }

  formatTarif(value: BoxEntity['tarifActuel']): string {
    if (value?.montant === null || value?.montant === undefined) {
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
          this.prefillForm(box);
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Impossible de charger la box.';
          this.snackBar.open(this.errorMessage, 'Fermer', { duration: 4000 });
        },
      });
  }

  private prefillForm(box: BoxEntity): void {
    const tarif = box.tarifActuel;
    if (tarif?.montant !== undefined && tarif?.montant !== null) {
      this.form.patchValue({ montant: tarif.montant });
    }
    if (tarif?.unite) {
      this.form.patchValue({ unite: tarif.unite });
    }
    if (tarif?.dateDebut) {
      this.form.patchValue({ dateDebut: this.toInputDate(tarif.dateDebut) });
    }
  }

  private buildPayload(): BoxTarifPayload | null {
    const raw = this.form.getRawValue();
    const dateDebut = this.toIsoDate(raw.dateDebut);

    if (!dateDebut) {
      this.serverError = 'Date debut requise.';
      this.cdr.markForCheck();
      return null;
    }

    const payload: BoxTarifPayload = {
      montant: Number(raw.montant),
      unite: raw.unite ?? 'mois',
      dateDebut,
    };

    if (raw.raison) {
      payload.raison = this.normalizeText(raw.raison) || undefined;
    }

    return payload;
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').toString().trim();
  }

  private toIsoDate(value: string | null | undefined): string {
    const normalized = this.normalizeText(value);
    if (!normalized) {
      return '';
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return normalized;
    }
    return parsed.toISOString();
  }

  private toInputDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const pad = (input: number) => input.toString().padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(
      parsed.getHours(),
    )}:${pad(parsed.getMinutes())}`;
  }
}
