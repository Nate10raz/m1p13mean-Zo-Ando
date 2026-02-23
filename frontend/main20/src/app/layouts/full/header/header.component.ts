// ─────────────────────────────────────────────────────────────
//  header.component.ts  (mis à jour avec dark mode toggle)
// ─────────────────────────────────────────────────────────────
import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
  OnInit,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
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
  ],
  templateUrl: './header.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit {
  @Input()  showToggle    = true;
  @Input()  toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();

  unreadCount = 0;

  /** Observable booléen consommé dans le template via async pipe */
  isDark$: Observable<boolean>;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private themeService: ThemeService,
  ) {
    this.isDark$ = this.themeService.mode$.pipe(map((m) => m === 'dark'));
  }

  ngOnInit(): void {
    this.fetchUnreadCount();
  }

  fetchUnreadCount(): void {
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.unreadCount = notifications.filter((n) => !n.lu).length;
      },
      error: (err) => console.error('Error fetching notifications', err),
    });
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next:  () => this.router.navigate(['/authentication/login']),
      error: () => this.router.navigate(['/authentication/login']),
    });
  }
}
