import { NavItem } from './nav-item/nav-item';

export const navItems: NavItem[] = [
  {
    navCap: 'Home',
  },
  {
    displayName: 'Accueil',
    iconName: 'home',
    route: '/accueil',
    roles: ['client'],
  },
  {
    displayName: 'Dashboard',
    iconName: 'layout-grid-add',
    route: '/dashboard',
    roles: ['admin', 'boutique'],
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
    navCap: 'Gestion Box',
    roles: ['admin'],
  },
  {
    displayName: 'Liste des boxes',
    iconName: 'list-details',
    route: '/boxes/liste',
    roles: ['admin'],
  },
  {
    displayName: 'Demandes de location',
    iconName: 'list-details',
    route: '/boxes/demandes',
    roles: ['admin'],
  },
  {
    displayName: 'Paiements de loyer',
    iconName: 'list-details',
    route: '/boxes/payements',
    roles: ['admin'],
  },
  {
    displayName: 'Creer une box',
    iconName: 'package',
    route: '/boxes/nouveau',
    roles: ['admin'],
  },
  {
    displayName: 'Creer un type de box',
    iconName: 'list-details',
    route: '/boxes/types/nouveau',
    roles: ['admin'],
  },
  {
    navCap: 'Boxes',
    roles: ['boutique'],
  },
  {
    displayName: 'Boxes disponibles',
    iconName: 'package',
    route: '/boxes-disponibles',
    roles: ['boutique'],
  },
  {
    displayName: 'Mes boxes',
    iconName: 'list-details',
    route: '/boxes-mes',
    roles: ['boutique'],
  },
  {
    displayName: 'Paiement loyer',
    iconName: 'credit-card',
    route: '/boxes-payements/nouveau',
    roles: ['boutique'],
  },
  {
    displayName: 'Historique paiements',
    iconName: 'list-details',
    route: '/boxes-payements',
    roles: ['boutique'],
  },
  {
    displayName: 'Mes demandes',
    iconName: 'list-details',
    route: '/boxes-demandes',
    roles: ['boutique'],
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
    displayName: 'Gestion des categories',
    iconName: 'list-details',
    route: '/admin/categorie',
    roles: ['admin'],
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
