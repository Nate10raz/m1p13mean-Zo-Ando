import { Routes } from '@angular/router';

import { AppSideLoginComponent } from './side-login/side-login.component';
import { AppSideRegisterComponent } from './side-register/side-register.component';
import { AppSideRegisterClientComponent } from './side-register-client/side-register-client.component';
import { AppSideRegisterBoutiqueComponent } from './side-register-boutique/side-register-boutique.component';

export const AuthenticationRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'login',
        component: AppSideLoginComponent,
      },
      {
        path: 'register',
        component: AppSideRegisterComponent,
      },
      {
        path: 'register-client',
        component: AppSideRegisterClientComponent,
      },
      {
        path: 'register-boutique',
        component: AppSideRegisterBoutiqueComponent,
      },
    ],
  },
];
