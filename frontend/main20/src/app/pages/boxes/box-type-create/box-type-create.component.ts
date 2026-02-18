import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from '../../../material.module';
import { BoxTypeCreatePayload, BoxTypeService } from 'src/app/services/box-type.service';

@Component({
  selector: 'app-box-type-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './box-type-create.component.html',
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
export class AppBoxTypeCreateComponent {
  isSubmitting = false;
  serverError = '';

  form = this.fb.group({
    nom: ['', Validators.required],
    description: [''],
    estActif: this.fb.control(true, { nonNullable: true }),
    caracteristiques: this.fb.array<
      FormGroup<{ nom: FormControl<string>; valeur: FormControl<string> }>
    >([]),
  });

  constructor(
    private fb: FormBuilder,
    private boxTypeService: BoxTypeService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  get caracteristiques(): FormArray<FormGroup<{ nom: FormControl<string>; valeur: FormControl<string> }>> {
    return this.form.get('caracteristiques') as FormArray<
      FormGroup<{ nom: FormControl<string>; valeur: FormControl<string> }>
    >;
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

    this.boxTypeService
      .createBoxType(payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'BoxType cree';
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
      nom: '',
      description: '',
      estActif: true,
    });
    this.caracteristiques.clear();
    this.serverError = '';
    this.cdr.markForCheck();
  }

  trackByIndex(index: number): number {
    return index;
  }

  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  private buildPayload(): BoxTypeCreatePayload | null {
    const raw = this.form.getRawValue();
    const nom = this.normalizeText(raw.nom);

    if (!nom) {
      this.serverError = 'Nom requis.';
      this.cdr.markForCheck();
      return null;
    }

    const caracteristiques = raw.caracteristiques
      .map((item) => ({
        nom: this.normalizeText(item?.nom),
        valeur: this.normalizeText(item?.valeur),
      }))
      .filter((item) => item.nom && item.valeur) as Array<{ nom: string; valeur: string }>;

    const payload: BoxTypeCreatePayload = {
      nom,
      estActif: raw.estActif,
    };

    if (raw.description) {
      payload.description = this.normalizeText(raw.description) || undefined;
    }
    if (caracteristiques.length) {
      payload.caracteristiques = caracteristiques;
    }

    return payload;
  }

  private normalizeText(value: string | null | undefined): string {
    return (value ?? '').toString().trim();
  }
}
