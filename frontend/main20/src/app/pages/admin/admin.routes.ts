import { Routes } from '@angular/router';

import { AppAdminAcheteurComponent } from './acheteur/acheteur.component';
import { AppAdminAcheteurDetailComponent } from './acheteur-detail/acheteur-detail.component';
import { AppAdminBoutiqueComponent } from './boutique/boutique.component';
import { AppAdminCategorieComponent } from './categorie/categorie.component';
import { AppAdminFraisLivraisonComponent } from './frais-livraison/frais-livraison.component';
import { AdminAvisSignalesComponent } from './avis-signales/avis-signales.component';

import { PublicationsSignaleesComponent } from './publications-signalees/publications-signalees.component';

export const AdminRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'acheteur',
        component: AppAdminAcheteurComponent,
      },
      {
        path: 'acheteur/:id',
        component: AppAdminAcheteurDetailComponent,
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
      {
        path: 'avis-signales',
        component: AdminAvisSignalesComponent,
      },
      {
        path: 'publications-signalees',
        component: PublicationsSignaleesComponent,
      },
    ],
  },
];
