import { Routes } from '@angular/router';

import { AppAdminAcheteurComponent } from './acheteur/acheteur.component';
import { AppAdminBoutiqueComponent } from './boutique/boutique.component';

export const AdminRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'acheteur',
        component: AppAdminAcheteurComponent,
      },
      {
        path: 'boutique',
        component: AppAdminBoutiqueComponent,
      },
    ],
  },
];
