import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';

import { MaterialModule } from 'src/app/material.module';
import { AuthService, ResetPasswordPayload } from 'src/app/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TablerIconsModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class AppResetPasswordComponent implements OnInit, OnDestroy {
  isSubmitting = false;
  serverError = '';
  showNewPassword = false;
  showConfirmPassword = false;
  token = '';
  private sub = new Subscription();

  form = new FormGroup(
    {
      newPassword: new FormControl('', [Validators.required]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: [this.passwordMatchValidator] },
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    this.sub.add(
      this.route.queryParamMap.subscribe((params) => {
        this.token = params.get('token') ?? '';
        if (!this.token) {
          this.serverError =
            "Lien invalide ou expire. Utilisez le lien envoye par l'administrateur.";
        } else {
          this.serverError = '';
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  submit(): void {
    if (!this.token) {
      this.serverError =
        "Lien invalide ou expire. Utilisez le lien envoye par l'administrateur.";
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.serverError = '';

    const payload: ResetPasswordPayload = {
      token: this.token,
      newPassword: (this.f.newPassword.value ?? '').trim(),
      confirmPassword: (this.f.confirmPassword.value ?? '').trim(),
    };

    this.authService
      .resetPassword(payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Mot de passe reinitialise';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.router.navigate(['/client/login']);
        },
        error: (error) => {
          this.serverError =
            error?.error?.message ?? 'Reinitialisation impossible. Veuillez reessayer.';
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const next = group.get('newPassword')?.value ?? '';
    const confirm = group.get('confirmPassword')?.value ?? '';

    if (!next || !confirm) {
      return null;
    }

    return next === confirm ? null : { passwordMismatch: true };
  }
}
