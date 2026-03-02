// ─────────────────────────────────────────────────────────────
//  header.component.ts  (mis à jour avec dark mode toggle)
// ─────────────────────────────────────────────────────────────
import { Component, Output, EventEmitter, Input, ViewEncapsulation, OnInit } from '@angular/core';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from 'src/app/services/auth.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ThemeService } from 'src/app/services/theme.service';
import { UserService, UserMeData } from 'src/app/services/user.service';
import { CartService } from 'src/app/services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
    AsyncPipe,
    NgOptimizedImage,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();

  unreadCount$: Observable<number>;
  profileName = 'Utilisateur';
  boutiqueName = '';
  isBoutique = false;
  profileInitials = 'U';
  roleLabel = 'Utilisateur';
  roleToneClass = 'role-pill--default';

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private themeService: ThemeService,
    private userService: UserService,
    public cartService: CartService,
  ) {
    this.unreadCount$ = this.notificationService.notifications$.pipe(
      map((notifications) => notifications.filter((n) => !n.lu).length),
    );
  }

  ngOnInit(): void {
    this.loadProfileHeader();
  }

  loadProfileHeader(): void {
    this.userService.getMe().subscribe({
      next: (response) => {
        const data = response?.data as UserMeData | undefined;
        const user = data?.user;
        const boutique = data?.boutique ?? null;
        this.profileName = this.resolveProfileName(user);
        this.profileInitials = this.resolveInitials(user, this.profileName);
        this.boutiqueName = boutique?.nom ?? '';
        const role = (user?.role ?? '').toLowerCase();
        this.isBoutique = role === 'boutique';
        this.roleLabel = this.resolveRoleLabel(role);
        this.roleToneClass = this.resolveRoleToneClass(role);
      },
      error: () => {
        this.profileName = 'Utilisateur';
        this.boutiqueName = '';
        this.isBoutique = false;
        this.profileInitials = 'U';
        this.roleLabel = 'Utilisateur';
        this.roleToneClass = 'role-pill--default';
      },
    });
  }

  private resolveProfileName(user?: {
    prenom?: string | null;
    nom?: string | null;
    email?: string | null;
  }): string {
    if (!user) {
      return 'Utilisateur';
    }
    const prenom = (user.prenom ?? '').trim();
    const nom = (user.nom ?? '').trim();
    const full = [prenom, nom].filter(Boolean).join(' ');
    if (full) {
      return full;
    }
    return (user.email ?? '').trim() || 'Utilisateur';
  }

  private resolveInitials(
    user: { prenom?: string | null; nom?: string | null; email?: string | null } | undefined,
    fallbackName: string,
  ): string {
    if (!user) {
      return 'U';
    }
    const prenom = (user.prenom ?? '').trim();
    const nom = (user.nom ?? '').trim();
    if (prenom && nom) {
      return `${prenom[0]}${nom[0]}`.toUpperCase();
    }
    if (prenom) {
      return prenom.slice(0, 2).toUpperCase();
    }
    if (nom) {
      return nom.slice(0, 2).toUpperCase();
    }
    const email = (user.email ?? '').trim();
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return fallbackName.slice(0, 2).toUpperCase() || 'U';
  }

  private resolveRoleLabel(role: string): string {
    if (role === 'admin') {
      return 'Admin';
    }
    if (role === 'boutique') {
      return 'Boutique';
    }
    if (role === 'client') {
      return 'Client';
    }
    return 'Utilisateur';
  }

  private resolveRoleToneClass(role: string): string {
    if (role === 'admin') {
      return 'role-pill--admin';
    }
    if (role === 'boutique') {
      return 'role-pill--boutique';
    }
    if (role === 'client') {
      return 'role-pill--client';
    }
    return 'role-pill--default';
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => this.router.navigate(['/']),
    });
  }
}
