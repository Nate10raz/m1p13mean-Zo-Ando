import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { BoxEntity, BoxService } from 'src/app/services/box.service';
import {
  PayementBoxCreatePayload,
  PayementBoxService,
} from 'src/app/services/payement-box.service';

interface BoxOption {
  id: string;
  label: string;
  tarif?: number;
}

@Component({
  selector: 'app-box-payement-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './box-payement-create.component.html',
  styles: [
    `
      .section-title {
        font-weight: 600;
        margin: 18px 0 8px;
      }

      .text-muted {
        color: #6b7280;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBoxPayementCreateComponent implements OnInit, OnDestroy {
  isSubmitting = false;
  isLoadingBoxes = false;
  serverError = '';
  boxOptions: BoxOption[] = [];
  readonly todayLabel = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  private readonly subscriptions = new Subscription();

  form = this.fb.group({
    boxId: ['', Validators.required],
    montant: [null as number | null, [Validators.required, Validators.min(0)]],
    periode: [''],
    commentaire: [''],
  });

  constructor(
    private fb: FormBuilder,
    private boxService: BoxService,
    private payementService: PayementBoxService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.disableMontant();
    this.loadBoxes();
    this.subscriptions.add(
      this.form.get('boxId')!.valueChanges.subscribe((boxId) => {
        if (!boxId) {
          return;
        }
        const option = this.boxOptions.find((item) => item.id === boxId);
        const montant = option?.tarif ?? null;
        this.form.patchValue({ montant });
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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

    this.payementService
      .createPayement(payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Payement cree.';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.resetForm();
        },
        error: (error) => {
          this.serverError = error?.error?.message ?? 'Creation impossible.';
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }

  resetForm(): void {
    this.form.reset({
      boxId: '',
      montant: null,
      periode: '',
      commentaire: '',
    });
    this.disableMontant();
    this.serverError = '';
    this.cdr.markForCheck();
  }

  private loadBoxes(): void {
    this.isLoadingBoxes = true;
    this.boxService
      .listMyBoxes({ page: 1, limit: 200 })
      .pipe(
        finalize(() => {
          this.isLoadingBoxes = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const items = response?.data?.items ?? [];
          this.boxOptions = items.map((item: BoxEntity) => ({
            id: item._id,
            label: `${item.numero} · Zone ${item.zone} · Etage ${item.etage}`,
            tarif: item.tarifActuel?.montant,
          }));
        },
        error: () => {
          this.boxOptions = [];
        },
      });
  }

  private buildPayload(): PayementBoxCreatePayload | null {
    const raw = this.form.getRawValue();
    const boxId = this.normalizeText(raw.boxId);
    const montant = raw.montant;

    if (!boxId || montant === null || montant === undefined) {
      this.serverError = 'Veuillez renseigner les champs requis.';
      this.cdr.markForCheck();
      return null;
    }

    const payload: PayementBoxCreatePayload = {
      boxId,
      montant: Number(montant),
      date: new Date().toISOString(),
    };

    if (raw.periode) {
      payload.periode = this.normalizeText(raw.periode) || undefined;
    }
    if (raw.commentaire) {
      payload.commentaire = this.normalizeText(raw.commentaire) || undefined;
    }

    return payload;
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').toString().trim();
  }

  private disableMontant(): void {
    const ctrl = this.form.get('montant');
    if (ctrl && !ctrl.disabled) {
      ctrl.disable({ emitEvent: false });
    }
  }
}
