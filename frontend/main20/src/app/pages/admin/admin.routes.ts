import { Routes } from '@angular/router';

import { AppAdminAcheteurComponent } from './acheteur/acheteur.component';
import { AppAdminBoutiqueComponent } from './boutique/boutique.component';
import { AppAdminCategorieComponent } from './categorie/categorie.component';
import { AppAdminFraisLivraisonComponent } from './frais-livraison/frais-livraison.component';

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
      {
        path: 'categorie',
        component: AppAdminCategorieComponent,
      },
      {
        path: 'frais-livraison',
        component: AppAdminFraisLivraisonComponent,
      },
    ],
  },
];
