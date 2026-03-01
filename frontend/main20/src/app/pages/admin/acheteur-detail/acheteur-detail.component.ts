import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { ApiResponse } from 'src/app/services/auth.service';
import {
  AdminService,
  AdminUser,
  AdminUserDetailResponse,
  AdminUserStatus,
} from 'src/app/services/admin.service';

@Component({
  selector: 'app-admin-acheteur-detail',
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './acheteur-detail.component.html',
  styleUrls: ['./acheteur-detail.component.scss'],
})
export class AppAdminAcheteurDetailComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';
  user: AdminUser | null = null;
  private sub = new Subscription();

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loadUser();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get displayName(): string {
    const prenom = this.user?.prenom?.trim();
    const nom = this.user?.nom?.trim();
    const full = [prenom, nom].filter(Boolean).join(' ').trim();
    return full || this.user?.email || 'Profil acheteur';
  }

  get roleLabel(): string {
    const role = (this.user?.role ?? '').toLowerCase().trim();
    if (role === 'admin') {
      return 'Administrateur';
    }
    if (role === 'boutique') {
      return 'Boutique';
    }
    if (role === 'client') {
      return 'Client';
    }
    return this.user?.role || '-';
  }

  get statusLabel(): string {
    const status = this.formatStatus(this.user?.status);
    if (status) {
      return status;
    }

    if (this.user?.isActive === undefined || this.user?.isActive === null) {
      return '-';
    }

    return this.user?.isActive ? 'Actif' : 'Inactif';
  }

  get statusToneClass(): string {
    if (this.user?.status) {
      return this.user.status === 'active' ? 'chip-success' : 'chip-warn';
    }

    if (this.user?.isActive === undefined || this.user?.isActive === null) {
      return 'chip-muted';
    }

    return this.user?.isActive ? 'chip-success' : 'chip-warn';
  }

  get emailVerifiedLabel(): string {
    return this.user?.isEmailVerified ? 'Email verifie' : 'Email non verifie';
  }

  get notificationsEnabled(): boolean | null {
    const value = this.user?.preferences?.notifications;
    if (value === undefined || value === null) {
      return null;
    }
    return Boolean(value);
  }

  get avatarUrl(): string {
    const userId = this.user?._id;
    if (!userId) {
      return 'assets/images/profile/user-1.jpg';
    }
    return this.resolveAvatar(userId);
  }

  formatStatus(status?: AdminUserStatus | null): string {
    if (!status) {
      return '';
    }

    switch (status) {
      case 'active':
        return 'Actif';
      case 'suspendue':
        return 'Suspendu';
      case 'en_attente':
        return 'En attente';
      case 'rejetee':
        return 'Rejete';
      default:
        return status;
    }
  }

  formatBoolean(value?: boolean | null): string {
    if (value === undefined || value === null) {
      return '-';
    }
    return value ? 'Oui' : 'Non';
  }

  private loadUser(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.errorMessage = 'Identifiant acheteur manquant.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.sub.add(
      this.adminService
        .getUserById(userId)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (response: ApiResponse<AdminUser | AdminUserDetailResponse>) => {
            const resolved = this.resolveUser(response);
            this.user = resolved;
            if (!this.user) {
              this.errorMessage = 'Aucune information de profil.';
            }
          },
          error: (error: HttpErrorResponse) => {
            this.user = null;
            this.errorMessage = error?.error?.message ?? 'Impossible de charger le profil.';
          },
        }),
    );
  }

  private resolveUser(
    response: ApiResponse<AdminUser | AdminUserDetailResponse> | null | undefined,
  ): AdminUser | null {
    const data = response?.data;
    if (!data) {
      return null;
    }
    if (typeof data === 'object' && 'user' in data) {
      return (data as AdminUserDetailResponse).user ?? null;
    }
    return data as AdminUser;
  }

  private resolveAvatar(userId: string): string {
    let hash = 0;
    for (const char of userId) {
      hash = (hash * 31 + char.charCodeAt(0)) % 4;
    }
    return `assets/images/profile/user-${hash + 1}.jpg`;
  }
}
