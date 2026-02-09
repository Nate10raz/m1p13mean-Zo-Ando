import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialModule } from 'src/app/material.module';
import { AuthService, BoutiqueRegisterPayload } from 'src/app/services/auth.service';

@Component({
  selector: 'app-side-register-boutique',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, FormsModule, ReactiveFormsModule],
  templateUrl: './side-register-boutique.component.html',
  styleUrls: ['./side-register-boutique.component.scss']
})
export class AppSideRegisterBoutiqueComponent {
  isSubmitting = false;
  serverError = '';

  // Variables pour afficher/masquer les mots de passe
  hidePassword = true;
  hideConfirmPassword = true;

  form = this.fb.group(
    {
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[+]?\d{7,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      boutique: this.fb.group({
        nom: ['', [Validators.required, Validators.minLength(2)]],
        adresse: ['', [Validators.required, Validators.minLength(3)]],
        telephone: ['', [Validators.required, Validators.pattern(/^[+]?\d{7,15}$/)]],
      }),
    },
    { validators: this.passwordsMatchValidator }
  );

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  get f() {
    return this.form.controls;
  }

  get b() {
    return (this.form.get('boutique') as FormGroup).controls;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.serverError = '';
    const { confirmPassword, ...payload } = this.form.getRawValue();

    this.authService
      .registerBoutique(payload as BoutiqueRegisterPayload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Inscription boutique reussie';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.router.navigate(['/authentication/login']);
        },
        error: (error) => {
          this.serverError = error?.error?.message ?? 'Inscription impossible. Veuillez reessayer.';
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!password || !confirm) {
      return null;
    }
    return password === confirm ? null : { passwordsMismatch: true };
  }

  /**
   * Toggle la visibilité du mot de passe
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  /**
   * Toggle la visibilité de la confirmation du mot de passe
   */
  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }
}
