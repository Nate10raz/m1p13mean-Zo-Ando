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
    navCap: 'Produits',
    roles: ['admin', 'boutique'],
  },
  {
    displayName: 'Liste des produits',
    iconName: 'list-details',
    route: '/produits/liste',
    roles: ['admin', 'boutique'],
  },
  {
    displayName: 'Creer un produit',
    iconName: 'package',
    route: '/produits/nouveau',
    roles: ['admin', 'boutique'],
  },
  {
    displayName: "Seuil d'alerte stock",
    iconName: 'alert-triangle',
    route: '/produits/stock-alert',
    roles: ['admin', 'boutique'],
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
