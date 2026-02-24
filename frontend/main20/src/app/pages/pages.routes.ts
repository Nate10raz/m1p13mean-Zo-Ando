import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';
import { BoutiqueInformationsComponent } from './boutique/informations/informations.component';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: StarterComponent,
    data: {
      title: 'Dashboard admin',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Finance & KPI' }],
    },
  },
  {
    path: 'boutique/:id',
    component: BoutiqueInformationsComponent,
    data: {
      title: 'Détails Boutique',
      urls: [
        { title: 'Dashboard', url: '/dashboard' },
        { title: 'Boutiques' },
        { title: 'Détails' },
      ],
    },
  },
];
