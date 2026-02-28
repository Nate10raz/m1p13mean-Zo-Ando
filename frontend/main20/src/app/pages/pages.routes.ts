import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';
import { BoutiqueInformationsComponent } from './boutique/informations/informations.component';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: StarterComponent,
    data: {
      title: 'Dashboard',
      urls: [{ title: 'Dashboard', url: '/dashboard' }],
    },
  },
  {
    path: 'boutique',
    component: BoutiqueInformationsComponent,
    data: {
      title: 'Ma Boutique',
      urls: [
        { title: 'Dashboard', url: '/dashboard' },
        { title: 'Boutique' },
        { title: 'Informations' },
      ],
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
