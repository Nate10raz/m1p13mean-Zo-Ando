import { Routes } from '@angular/router';

import { AppSideRegisterComponent } from './side-register/side-register.component';
import { AppSideRegisterClientComponent } from './side-register-client/side-register-client.component';
import { AppSideRegisterBoutiqueComponent } from './side-register-boutique/side-register-boutique.component';
import { AppResetPasswordComponent } from './reset-password/reset-password.component';

export const AuthenticationRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'login',
        redirectTo: '/client/login',
        pathMatch: 'full',
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
      {
        path: 'reset-password',
        component: AppResetPasswordComponent,
      },
      {
        path: 'forgot-password',
        component: AppResetPasswordComponent,
      },
    ],
  },
];
