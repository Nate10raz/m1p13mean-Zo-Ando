import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';
import { BoutiqueInformationsComponent } from './boutique/informations/informations.component';
import { BoutiqueInventaireComponent } from './boutique/inventaire/inventaire.component';

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
    path: 'boutique/inventaire',
    component: BoutiqueInventaireComponent,
    data: {
      title: 'Inventaire',
      urls: [
        { title: 'Dashboard', url: '/dashboard' },
        { title: 'Boutique' },
        { title: 'Inventaire' },
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
