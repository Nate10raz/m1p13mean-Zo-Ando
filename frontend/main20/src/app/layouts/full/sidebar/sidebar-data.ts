import { NavItem } from './nav-item/nav-item';

export const navItems: NavItem[] = [
  {
    navCap: 'Home',
  },
  {
    displayName: 'Dashboard',
    iconName: 'layout-grid-add',
    route: '/dashboard',
  },
  {
    navCap: 'Ui Components',
  },
  {
    displayName: 'Badge',
    iconName: 'archive',
    route: '/ui-components/badge',
  },
  {
    displayName: 'Chips',
    iconName: 'info-circle',
    route: '/ui-components/chips',
  },
  {
    displayName: 'Lists',
    iconName: 'list-details',
    route: '/ui-components/lists',
  },
  {
    displayName: 'Menu',
    iconName: 'file-text',
    route: '/ui-components/menu',
  },
  {
    displayName: 'Tooltips',
    iconName: 'file-text-ai',
    route: '/ui-components/tooltips',
  },
  {
    displayName: 'Forms',
    iconName: 'clipboard-text',
    route: '/ui-components/forms',
  },
  {
    displayName: 'Tables',
    iconName: 'table',
    route: '/ui-components/tables',
  },
  {
    navCap: 'Administration',
    roles: ['admin'],
  },
  {
    displayName: 'Gestion des utilisateurs',
    iconName: 'users',
    route: '/admin',
    roles: ['admin'],
    children: [
      {
        displayName: 'Acheteur',
        iconName: 'point',
        route: '/admin/acheteur',
        roles: ['admin'],
      },
      {
        displayName: 'Boutique',
        iconName: 'point',
        route: '/admin/boutique',
        roles: ['admin'],
      },
    ],
  },
  {
    displayName: 'Gestion des categories',
    iconName: 'list-details',
    route: '/admin/categorie',
    roles: ['admin'],
  },
  {
    navCap: 'Extra',
  },
  {
    displayName: 'Icons',
    iconName: 'mood-smile',
    route: '/extra/icons',
  },
  {
    displayName: 'Sample Page',
    iconName: 'brand-dribbble',
    route: '/extra/sample-page',
  },
  {
    navCap: 'Auth',
  },
  {
    displayName: 'Login',
    iconName: 'login',
    route: '/authentication',
    children: [
      {
        displayName: 'Login',
        iconName: 'point',
        route: '/authentication/login',
      },
    ],
  },
  {
    displayName: 'Register',
    iconName: 'user-plus',
    route: '/authentication',
    children: [
      {
        displayName: 'Register',
        iconName: 'point',
        route: '/authentication/register',
      },
      {
        displayName: 'Register Client',
        iconName: 'point',
        route: '/authentication/register-client',
      },
      {
        displayName: 'Register Boutique',
        iconName: 'point',
        route: '/authentication/register-boutique',
      },
    ],
  },
];
