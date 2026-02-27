import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '../../../material.module';
import { BoxService, BoxCreatePayload } from 'src/app/services/box.service';
import { BoxTypeEntity, BoxTypeService } from 'src/app/services/box-type.service';

@Component({
  selector: 'app-box-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './box-create.component.html',
  styles: [
    `
      .section-title {
        font-weight: 600;
        margin: 18px 0 8px;
      }

      .inline-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .row-item {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-end;
        margin-bottom: 12px;
      }

      .row-item mat-form-field {
        flex: 1 1 220px;
      }

      .empty-state {
        padding: 8px 0;
        color: #6b7280;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBoxCreateComponent implements OnInit, OnDestroy {
  isSubmitting = false;
  serverError = '';
  isLoadingTypes = false;
  boxTypes: BoxTypeEntity[] = [];

  private readonly subscriptions = new Subscription();

  form = this.fb.group({
    numero: ['', Validators.required],
    etage: [0, [Validators.required]],
    zone: ['', Validators.required],
    allee: [''],
    position: [''],
    description: [''],
    superficie: [null as number | null, [Validators.required, Validators.min(0)]],
    typeId: ['', Validators.required],
    montant: [null as number | null, [Validators.required, Validators.min(0)]],
    unite: this.fb.control<'mois' | 'annee'>('mois', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    dateDebut: ['', Validators.required],
    raison: [''],
    caracteristiques: this.fb.array<
      FormGroup<{ nom: FormControl<string>; valeur: FormControl<string> }>
    >([]),
    photos: this.fb.array<FormControl<string>>([]),
  });

  constructor(
    private fb: FormBuilder,
    private boxService: BoxService,
    private boxTypeService: BoxTypeService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadBoxTypes();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get caracteristiques(): FormArray<
    FormGroup<{ nom: FormControl<string>; valeur: FormControl<string> }>
  > {
    return this.form.get('caracteristiques') as FormArray<
      FormGroup<{ nom: FormControl<string>; valeur: FormControl<string> }>
    >;
  }

  get photos(): FormArray<FormControl<string>> {
    return this.form.get('photos') as FormArray<FormControl<string>>;
  }

  addCaracteristique(): void {
    this.caracteristiques.push(
      this.fb.group({
        nom: this.fb.control('', { nonNullable: true }),
        valeur: this.fb.control('', { nonNullable: true }),
      }),
    );
  }

  removeCaracteristique(index: number): void {
    this.caracteristiques.removeAt(index);
  }

  addPhoto(): void {
    this.photos.push(new FormControl('', { nonNullable: true }));
  }

  removePhoto(index: number): void {
    this.photos.removeAt(index);
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
      .createBox(payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Box creee';
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
      numero: '',
      etage: 0,
      zone: '',
      allee: '',
      position: '',
      description: '',
      superficie: null,
      typeId: '',
      montant: null,
      unite: 'mois',
      dateDebut: '',
      raison: '',
    });
    this.caracteristiques.clear();
    this.photos.clear();
    this.serverError = '';
    this.cdr.markForCheck();
  }

  trackByIndex(index: number): number {
    return index;
  }

  private loadBoxTypes(): void {
    this.isLoadingTypes = true;
    this.boxTypeService
      .listBoxTypes({ page: 1, limit: 200, estActif: true })
      .pipe(
        finalize(() => {
          this.isLoadingTypes = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const items = response?.data?.items ?? [];
          this.boxTypes = items.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        },
        error: () => {
          this.boxTypes = [];
        },
      });
  }

  private buildPayload(): BoxCreatePayload | null {
    const raw = this.form.getRawValue();
    const numero = this.normalizeText(raw.numero);
    const zone = this.normalizeText(raw.zone);
    const typeId = this.normalizeText(raw.typeId);
    const dateDebut = this.toIsoDate(raw.dateDebut);

    if (!numero || !zone || !typeId || !dateDebut) {
      this.serverError = 'Veuillez renseigner les champs requis.';
      this.cdr.markForCheck();
      return null;
    }

    const caracteristiques = (raw.caracteristiques as Array<{ nom?: string; valeur?: string }>)
      .map((item) => ({
        nom: this.normalizeText(item?.nom),
        valeur: this.normalizeText(item?.valeur),
      }))
      .filter((item) => item.nom && item.valeur) as Array<{ nom: string; valeur: string }>;

    const photos = (raw.photos as string[])
      .map((item) => this.normalizeText(item))
      .filter((item): item is string => Boolean(item));

    const payload: BoxCreatePayload = {
      numero,
      etage: Number(raw.etage),
      zone,
      superficie: Number(raw.superficie),
      typeId,
      montant: Number(raw.montant),
      unite: raw.unite ?? 'mois',
      dateDebut,
    };

    if (raw.allee) {
      payload.allee = this.normalizeText(raw.allee) || undefined;
    }
    if (raw.position) {
      payload.position = this.normalizeText(raw.position) || undefined;
    }
    if (raw.description) {
      payload.description = this.normalizeText(raw.description) || undefined;
    }
    if (raw.raison) {
      payload.raison = this.normalizeText(raw.raison) || undefined;
    }
    if (caracteristiques.length) {
      payload.caracteristiques = caracteristiques;
    }
    if (photos.length) {
      payload.photos = photos;
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

  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  asFormControl(control: AbstractControl): FormControl {
    return control as FormControl;
  }
}
