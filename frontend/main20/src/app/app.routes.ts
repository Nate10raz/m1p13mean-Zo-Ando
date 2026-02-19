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
        loadComponent: () =>
          import('./pages/home-redirect/home-redirect.component').then(
            (m) => m.HomeRedirectComponent,
          ),
        pathMatch: 'full',
      },
      {
        path: 'accueil',
        canActivate: [RoleGuard],
        data: { roles: ['client'] },
        loadComponent: () =>
          import('./pages/accueil-client/accueil-client.component').then(
            (m) => m.AccueilClientComponent,
          ),
      },
      {
        path: 'produit/:id',
        canActivate: [RoleGuard],
        data: { roles: ['client'] },
        loadComponent: () =>
          import('./pages/produit-fiche/produit-fiche.component').then(
            (m) => m.AppProduitFicheComponent,
          ),
      },
      {
        path: 'dashboard',
        canActivate: [RoleGuard],
        data: { roles: ['admin', 'boutique'] },
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
      {
        path: 'boxes',
        canActivate: [RoleGuard],
        data: { roles: ['admin'] },
        loadChildren: () => import('./pages/boxes/boxes.routes').then((m) => m.BoxesRoutes),
      },
      {
        path: 'boxes-disponibles',
        canActivate: [RoleGuard],
        data: { roles: ['boutique'] },
        loadComponent: () =>
          import('./pages/boxes/box-available/box-available.component').then(
            (m) => m.AppBoxAvailableComponent,
          ),
      },
      {
        path: 'boxes-demandes',
        canActivate: [RoleGuard],
        data: { roles: ['boutique'] },
        loadComponent: () =>
          import('./pages/boxes/box-demand-my-list/box-demand-my-list.component').then(
            (m) => m.AppBoxDemandMyListComponent,
          ),
      },
      {
        path: 'boxes-mes',
        canActivate: [RoleGuard],
        data: { roles: ['boutique'] },
        loadComponent: () =>
          import('./pages/boxes/box-my-list/box-my-list.component').then(
            (m) => m.AppBoxMyListComponent,
          ),
      },
      {
        path: 'boxes-payements/nouveau',
        canActivate: [RoleGuard],
        data: { roles: ['boutique'] },
        loadComponent: () =>
          import('./pages/boxes/box-payement-create/box-payement-create.component').then(
            (m) => m.AppBoxPayementCreateComponent,
          ),
      },
      {
        path: 'boxes-payements',
        canActivate: [RoleGuard],
        data: { roles: ['boutique'] },
        loadComponent: () =>
          import('./pages/boxes/box-payement-list/box-payement-list.component').then(
            (m) => m.AppBoxPayementListComponent,
          ),
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
