import { Routes } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    component: FullComponent,
    canActivateChild: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./pages/pages.routes').then((m) => m.PagesRoutes),
      },
      {
        path: 'ui-components',
        loadChildren: () =>
          import('./pages/ui-components/ui-components.routes').then((m) => m.UiComponentsRoutes),
      },
      {
        path: 'extra',
        loadChildren: () => import('./pages/extra/extra.routes').then((m) => m.ExtraRoutes),
      },
      {
        path: 'access-denied',
        loadChildren: () =>
          import('./pages/access-denied/access-denied.routes').then((m) => m.AccessDeniedRoutes),
      },
      {
        path: 'notification',
        loadComponent: () =>
          import('./pages/notification/notification.component').then(
            (m) => m.NotificationComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [RoleGuard],
        data: { roles: ['admin'] },
        loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.AdminRoutes),
      },
      {
        path: 'produits',
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'boutique'] },
        loadChildren: () =>
          import('./pages/produits/produits.routes').then((m) => m.ProduitsRoutes),
      },
    ],
  },
  {
    path: '',
    component: BlankComponent,
    children: [
      {
        path: 'authentication',
        loadChildren: () =>
          import('./pages/authentication/authentication.routes').then(
            (m) => m.AuthenticationRoutes,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'authentication/error',
  },
];
