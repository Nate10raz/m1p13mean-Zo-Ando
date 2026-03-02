import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TablerIconsModule } from 'angular-tabler-icons';

import { MaterialModule } from 'src/app/material.module';
import { AuthService, ClientRegisterPayload } from 'src/app/services/auth.service';
import { GoogleAuthService } from 'src/app/services/google-auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-side-register-client',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
  ],
  templateUrl: './side-register-client.component.html',
  styleUrl: './side-register-client.component.scss',
})
export class AppSideRegisterClientComponent implements AfterViewInit {
  @ViewChild('googleBtn', { static: false }) googleBtn?: ElementRef<HTMLDivElement>;

  isSubmitting = false;
  serverError = '';
  hidePassword = true;
  hideConfirmPassword = true;
  googleEnabled = Boolean(environment.googleClientId);

  form = this.fb.group(
    {
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[+]?\d{7,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatchValidator },
  );

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private googleAuthService: GoogleAuthService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  get f() {
    return this.form.controls;
  }

  ngAfterViewInit(): void {
    if (!this.googleEnabled) {
      return;
    }
    this.initGoogleButton();
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
      .registerClient(payload as ClientRegisterPayload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Inscription client réussie';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          this.router.navigate(['/client/login']);
        },
        error: (error) => {
          this.serverError = error?.error?.message ?? 'Inscription impossible. Veuillez réessayer.';
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }

  private initGoogleButton(): void {
    const container = this.googleBtn?.nativeElement;
    if (!container) {
      return;
    }

    this.googleAuthService
      .renderButton(
        container,
        (credential) => this.handleGoogleCredential(credential),
        { text: 'signup_with' },
      )
      .catch(() => {
        this.serverError = 'Inscription Google indisponible pour le moment.';
        this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
      });
  }

  private handleGoogleCredential(credential: string): void {
    this.isSubmitting = true;
    this.serverError = '';

    this.authService
      .loginWithGoogle({ idToken: credential, role: 'client' })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Inscription Google reussie';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          const accessToken = response?.data?.accessToken;
          if (accessToken) {
            this.router.navigate(['/accueil']);
          } else {
            this.router.navigate(['/client/login']);
          }
        },
        error: (error) => {
          if (error?.error?.message === 'ROLE_MISMATCH') {
            this.serverError = 'Profil incorrect pour cette page d\u2019inscription.';
          } else {
            this.serverError = error?.error?.message ?? 'Inscription Google impossible.';
          }
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!password || !confirm) return null;
    return password === confirm ? null : { passwordsMismatch: true };
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }
}
