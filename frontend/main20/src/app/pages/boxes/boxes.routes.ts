import { Routes } from '@angular/router';

import { AppBoxCreateComponent } from './box-create/box-create.component';
import { AppBoxDemandListComponent } from './box-demand-list/box-demand-list.component';
import { AppBoxDetailComponent } from './box-detail/box-detail.component';
import { AppBoxListComponent } from './box-list/box-list.component';
import { AppBoxTarifComponent } from './box-tarif/box-tarif.component';
import { AppBoxTypeCreateComponent } from './box-type-create/box-type-create.component';

export const BoxesRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'nouveau',
        component: AppBoxCreateComponent,
      },
      {
        path: 'liste',
        component: AppBoxListComponent,
      },
      {
        path: 'demandes',
        component: AppBoxDemandListComponent,
      },
      {
        path: 'types/nouveau',
        component: AppBoxTypeCreateComponent,
      },
      {
        path: ':id/tarif',
        component: AppBoxTarifComponent,
      },
      {
        path: ':id',
        component: AppBoxDetailComponent,
      },
      {
        path: '',
        redirectTo: 'liste',
        pathMatch: 'full',
      },
    ],
  },
];
