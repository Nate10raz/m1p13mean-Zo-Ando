import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

import { MaterialModule } from 'src/app/material.module';
import { AuthService, LoginPayload } from 'src/app/services/auth.service';

@Component({
  selector: 'app-side-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
  ],
  templateUrl: './side-login.component.html',
  styleUrls: ['./side-login.component.scss'],
})
export class AppSideLoginComponent {
  isSubmitting = false;
  serverError  = '';
  hidePassword = true; // ← toggle mot de passe

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  form = new FormGroup({
    email:    new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  get f() {
    return this.form.controls;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.serverError  = '';

    this.authService
      .login(this.form.getRawValue() as LoginPayload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Connexion reussie';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });

          const role           = response?.data?.user?.role ?? this.authService.getCurrentRole();
          const normalizedRole = role?.toLowerCase().trim();
          const target         = normalizedRole === 'client' ? '/accueil' : '/dashboard';

          this.router.navigate([target]);
        },
        error: (error) => {
          this.serverError = error?.error?.message ?? 'Connexion impossible. Veuillez reessayer.';
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }
}
