import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';

export const PagesRoutes: Routes = [
  {
    path: '',
    component: StarterComponent,
    data: {
      title: 'Dashboard admin',
      urls: [{ title: 'Dashboard', url: '/dashboard' }, { title: 'Finance & KPI' }],
    },
  },
];
