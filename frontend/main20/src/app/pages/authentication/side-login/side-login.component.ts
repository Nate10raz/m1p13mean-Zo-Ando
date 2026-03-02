import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TablerIconsModule } from 'angular-tabler-icons';

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
    MatProgressSpinnerModule,
    TablerIconsModule,
  ],
  templateUrl: './side-login.component.html',
  styleUrl: './side-login.component.scss',
})
export class AppSideLoginComponent implements OnInit {
  isSubmitting = false;
  serverError = '';
  hidePassword = true;
  role: 'client' | 'boutique' | 'admin' = 'client';
  roleLabel = 'Client';
  pageTitle = 'Connexion client';
  registerLink: string | null = '/authentication/register-client';
  registerLabel = 'Créer un compte client';

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  get f() {
    return this.form.controls;
  }

  ngOnInit(): void {
    const roleFromRoute = String(this.route.snapshot.data['role'] ?? '')
      .toLowerCase()
      .trim();
    if (roleFromRoute === 'boutique' || roleFromRoute === 'admin' || roleFromRoute === 'client') {
      this.role = roleFromRoute;
    }

    if (this.role === 'boutique') {
      this.roleLabel = 'Boutique';
      this.pageTitle = 'Connexion boutique';
      this.registerLink = '/authentication/register-boutique';
      this.registerLabel = 'Créer un compte boutique';
    } else if (this.role === 'admin') {
      this.roleLabel = 'Admin';
      this.pageTitle = 'Connexion admin';
      this.registerLink = null;
      this.registerLabel = '';
    } else {
      this.roleLabel = 'Client';
      this.pageTitle = 'Connexion client';
      this.registerLink = '/authentication/register-client';
      this.registerLabel = 'Créer un compte client';
    }

    const defaults: Record<'client' | 'boutique' | 'admin', LoginPayload> = {
      admin: { email: 'admin@example.com', password: 'admin123' },
      boutique: { email: 'boutique@example.com', password: 'secret123' },
      client: { email: 'client@example.com', password: 'sercret123' },
    };

    this.form.setValue(defaults[this.role]);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.serverError = '';

    this.authService
      .loginWithRole(this.form.getRawValue() as LoginPayload, this.role)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          const message = response?.message ?? 'Connexion réussie';
          this.snackBar.open(message, 'Fermer', { duration: 3000 });
          const target = this.role === 'client' ? '/accueil' : '/dashboard';
          this.router.navigate([target]);
        },
        error: (error) => {
          if (error?.message === 'ROLE_MISMATCH') {
            this.serverError = 'Profil incorrect pour cette page de connexion.';
            this.authService.logout().subscribe();
          } else {
            this.serverError = error?.error?.message ?? 'Connexion impossible. Veuillez réessayer.';
          }
          this.snackBar.open(this.serverError, 'Fermer', { duration: 4000 });
        },
      });
  }
}
