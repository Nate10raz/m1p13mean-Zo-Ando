import { Routes } from '@angular/router';

import { AppProduitCreateComponent } from './produit-create/produit-create.component';
import { AppProduitDetailComponent } from './produit-detail/produit-detail.component';
import { AppProduitEditComponent } from './produit-edit/produit-edit.component';
import { AppProduitListComponent } from './produit-list/produit-list.component';
import { AppProduitMediaComponent } from './produit-media/produit-media.component';

export const ProduitsRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'nouveau',
        component: AppProduitCreateComponent,
      },
      {
        path: 'liste',
        component: AppProduitListComponent,
      },
      {
        path: ':id/medias',
        component: AppProduitMediaComponent,
      },
      {
        path: ':id/modifier',
        component: AppProduitEditComponent,
      },
      {
        path: ':id',
        component: AppProduitDetailComponent,
      },
      {
        path: '',
        redirectTo: 'liste',
        pathMatch: 'full',
      },
    ],
  },
];
