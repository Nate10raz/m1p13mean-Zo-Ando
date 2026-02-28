import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';

interface Product {
  id: number;
  name: string;
  boutique: string;
  price: string;
  oldPrice?: string;
  rating: string;
  icon: string;
  imgBg: string;
  badge?: string;
  badgeClass?: string;
  category: string;
}

interface PricingPlan {
  key: string;
  name: string;
  price: string;
  period?: string;
  desc: string;
  features: string[];
  cta: string;
  icon: string;
  iconClass: string;
  featured: boolean;
}

interface Testimonial {
  id: number;
  quote: string;
  name: string;
  initials: string;
  role: string;
  featured: boolean;
}

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  open: boolean;
}

interface HowStep {
  num: string;
  icon: string;
  title: string;
  desc: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, TablerIconsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {

  currentYear = new Date().getFullYear();

  // ─── Hero stats ────────────────────────────────────────────────
  heroStats = [
    { key: 'boutiques', value: '500+', label: 'Boutiques actives' },
    { key: 'acheteurs', value: '12 000+', label: 'Acheteurs inscrits' },
    { key: 'note', value: '4.8/5', label: 'Note moyenne' },
  ];

  // ─── Hero cards preview ────────────────────────────────────────
  heroPreviewProducts = [
    { id: 1, name: 'Sac artisanal', price: '35 000 Ar', icon: 'shopping-bag', bg: 'rgba(93,135,255,0.18)', stock: '75%' },
    { id: 2, name: 'Tissu soie', price: '18 000 Ar', icon: 'sparkles', bg: 'rgba(68,183,247,0.18)', stock: '45%' },
    { id: 3, name: 'Chaussures', price: '52 000 Ar', icon: 'circle-dot', bg: 'rgba(19,222,185,0.18)', stock: '88%' },
  ];

  // ─── Trust band ────────────────────────────────────────────────
  brands = ['MVola', 'Orange Money', 'Airtel Money', 'BNI Madagascar', 'BOA', 'Telma'];

  socials = [
    { icon: 'brand-facebook', url: '#' },
    { icon: 'brand-instagram', url: '#' },
    { icon: 'brand-x', url: '#' },
  ];

  // ─── Catégories produits ───────────────────────────────────────
  categories = [
    { key: 'all', label: 'Tout', icon: 'layout-grid' },
    { key: 'mode', label: 'Mode', icon: 'shirt' },
    { key: 'alimentation', label: 'Alimentation', icon: 'apple' },
    { key: 'electronique', label: 'Électronique', icon: 'device-mobile' },
  ];

  activeCategory = 'all';

  allProducts: Product[] = [
    {
      id: 1, name: 'Sac en raphia', boutique: 'Artisanat Malagasy',
      price: '35 000 Ar', rating: '4.8', icon: 'shopping-bag',
      imgBg: 'linear-gradient(135deg, rgba(93,135,255,0.15), rgba(68,183,247,0.2))',
      badge: 'Populaire', badgeClass: 'bg-light-primary text-primary',
      category: 'mode',
    },
    {
      id: 2, name: 'Vanille de Madagascar', boutique: 'Épices & Co',
      price: '12 000 Ar', oldPrice: '15 000 Ar', rating: '4.9', icon: 'leaf',
      imgBg: 'linear-gradient(135deg, rgba(19,222,185,0.15), rgba(19,222,185,0.25))',
      badge: '-20%', badgeClass: 'bg-light-success text-success',
      category: 'alimentation',
    },
    {
      id: 3, name: 'Smartphone Galaxy A', boutique: 'Tech Store 101',
      price: '480 000 Ar', rating: '4.6', icon: 'device-mobile',
      imgBg: 'linear-gradient(135deg, rgba(255,174,31,0.15), rgba(255,174,31,0.25))',
      badge: 'Nouveau', badgeClass: 'bg-light-warning text-warning',
      category: 'electronique',
    },
    {
      id: 4, name: 'Lamba soie brodé', boutique: 'Tissu Fianarantsoa',
      price: '68 000 Ar', rating: '4.7', icon: 'sparkles',
      imgBg: 'linear-gradient(135deg, rgba(250,137,107,0.15), rgba(250,137,107,0.25))',
      category: 'mode',
    },
    {
      id: 5, name: 'Café Arabica 500g', boutique: 'Café des Hautes Terres',
      price: '22 000 Ar', rating: '4.9', icon: 'coffee',
      imgBg: 'linear-gradient(135deg, rgba(68,183,247,0.15), rgba(93,135,255,0.2))',
      category: 'alimentation',
    },
    {
      id: 6, name: 'Écouteurs sans fil', boutique: 'Tech Store 101',
      price: '95 000 Ar', oldPrice: '120 000 Ar', rating: '4.5', icon: 'headphones',
      imgBg: 'linear-gradient(135deg, rgba(93,135,255,0.18), rgba(19,222,185,0.15))',
      badge: '-21%', badgeClass: 'bg-light-success text-success',
      category: 'electronique',
    },
    {
      id: 7, name: 'Chapeau traditionnel', boutique: 'Artisanat Malagasy',
      price: '28 000 Ar', rating: '4.8', icon: 'hat',
      imgBg: 'linear-gradient(135deg, rgba(255,174,31,0.18), rgba(68,183,247,0.15))',
      category: 'mode',
    },
    {
      id: 8, name: 'Crevettes séchées 1kg', boutique: 'Produits de la Mer',
      price: '45 000 Ar', rating: '4.7', icon: 'fish',
      imgBg: 'linear-gradient(135deg, rgba(19,222,185,0.18), rgba(68,183,247,0.2))',
      category: 'alimentation',
    },
  ];

  get filteredProducts(): Product[] {
    if (this.activeCategory === 'all') return this.allProducts;
    return this.allProducts.filter(p => p.category === this.activeCategory);
  }

  voirProduit(prod: Product): void {
    // Rediriger vers page produit ou login
    console.log('Voir produit:', prod.name);
  }

  // ─── Comment ça marche ─────────────────────────────────────────
  howTab: 'acheteur' | 'vendeur' = 'acheteur';

  stepsAcheteur: HowStep[] = [
    {
      num: '01', icon: 'user-plus',
      title: 'Créez votre compte',
      desc: 'Inscription gratuite en moins de 2 minutes. Email, nom, mot de passe — c\'est tout.',
    },
    {
      num: '02', icon: 'search',
      title: 'Explorez les boutiques',
      desc: 'Parcourez des centaines de boutiques et de produits classés par catégorie.',
    },
    {
      num: '03', icon: 'shopping-cart',
      title: 'Commandez en toute sécurité',
      desc: 'Ajoutez au panier, payez en ligne et suivez votre commande en temps réel.',
    },
  ];

  stepsVendeur: HowStep[] = [
    {
      num: '01', icon: 'file-text',
      title: 'Demandez une box',
      desc: 'Choisissez votre espace commercial dans le centre et soumettez votre demande.',
    },
    {
      num: '02', icon: 'building-store',
      title: 'Ouvrez votre boutique',
      desc: 'Une fois approuvé, créez votre boutique et ajoutez vos produits facilement.',
    },
    {
      num: '03', icon: 'chart-bar',
      title: 'Vendez & suivez vos stats',
      desc: 'Gérez vos commandes, stocks et revenus depuis votre tableau de bord dédié.',
    },
  ];

  // ─── Tarifs ────────────────────────────────────────────────────
  plans: PricingPlan[] = [
    {
      key: 'acheteur', name: 'Acheteur', price: 'Gratuit',
      desc: 'Pour tous ceux qui souhaitent acheter dans notre centre commercial.',
      features: [
        'Accès à toutes les boutiques',
        'Panier & commandes illimités',
        'Suivi de commande en temps réel',
        'Historique d\'achats complet',
        'Avis et notations',
      ],
      cta: 'Créer un compte gratuit',
      icon: 'shopping-bag',
      iconClass: 'bg-light-primary text-primary',
      featured: false,
    },
    {
      key: 'vendeur', name: 'Vendeur Standard', price: '150 000 Ar', period: '/ mois',
      desc: 'Pour les entrepreneurs qui veulent démarrer leur activité dans notre marché.',
      features: [
        'Location d\'une box commerciale',
        'Boutique en ligne personnalisée',
        'Gestion des commandes & stocks',
        'Tableau de bord des ventes',
        'Support par email',
      ],
      cta: 'Louer une box',
      icon: 'building-store',
      iconClass: 'bg-light-warning text-warning',
      featured: true,
    },
    {
      key: 'premium', name: 'Vendeur Premium', price: '280 000 Ar', period: '/ mois',
      desc: 'Pour les boutiques qui veulent plus de visibilité et de fonctionnalités.',
      features: [
        'Tout du plan Standard inclus',
        'Box de grande superficie',
        'Mise en avant prioritaire',
        'Statistiques avancées',
        'Support prioritaire 7j/7',
      ],
      cta: 'Passer Premium',
      icon: 'crown',
      iconClass: 'bg-light-success text-success',
      featured: false,
    },
  ];

  // ─── Témoignages ───────────────────────────────────────────────
  testimonials: Testimonial[] = [
    {
      id: 1,
      quote: 'Depuis que j\'ai ouvert ma boutique ici, mes ventes ont augmenté de 60%. La plateforme est vraiment intuitive.',
      name: 'Miora Rakotondrabe', initials: 'MR',
      role: 'Vendeuse · Vêtements & Accessoires',
      featured: true,
    },
    {
      id: 2,
      quote: 'Je fais tous mes achats du mois ici. C\'est pratique, les prix sont bons et les vendeurs sont sérieux.',
      name: 'Hery Andriantsoa', initials: 'HA',
      role: 'Acheteur fidèle',
      featured: false,
    },
    {
      id: 3,
      quote: 'Le tableau de bord est excellent. Je peux gérer toute ma boutique depuis mon téléphone.',
      name: 'Fanja Razafindrakoto', initials: 'FR',
      role: 'Vendeur · Électronique',
      featured: false,
    },
    {
      id: 4,
      quote: 'L\'inscription est simple et le support répond vite. Je recommande à tous les commerçants.',
      name: 'Lanto Rasolofoson', initials: 'LR',
      role: 'Vendeur · Alimentation',
      featured: false,
    },
  ];

  // ─── FAQ ───────────────────────────────────────────────────────
  faqs: FaqItem[] = [
    {
      id: 1,
      question: 'Comment s\'inscrire sur la plateforme ?',
      answer: 'L\'inscription est gratuite et prend moins de 2 minutes. Cliquez sur "Commencer gratuitement", renseignez vos informations et vous êtes prêt à acheter ou à soumettre une demande de box.',
      open: true,
    },
    {
      id: 2,
      question: 'Comment louer une box pour vendre mes produits ?',
      answer: 'Une fois inscrit, rendez-vous dans "Demande de location". Sélectionnez la box qui vous convient (zone, étage, superficie). Votre demande sera traitée sous 48h ouvrables.',
      open: false,
    },
    {
      id: 3,
      question: 'Quels moyens de paiement sont acceptés ?',
      answer: 'Nous acceptons MVola, Orange Money, Airtel Money, les virements bancaires BNI et BOA. Le paiement en ligne est sécurisé et toutes les transactions sont chiffrées.',
      open: false,
    },
    {
      id: 4,
      question: 'Puis-je gérer plusieurs boutiques avec un seul compte ?',
      answer: 'Oui, chaque compte vendeur peut gérer plusieurs boxes depuis un seul tableau de bord. Vous pouvez louer plusieurs espaces et tout centraliser en un seul endroit.',
      open: false,
    },
    {
      id: 5,
      question: 'Comment contacter le support en cas de problème ?',
      answer: 'Notre équipe est disponible par email, téléphone et via la messagerie intégrée dans votre espace client. Les abonnés Premium bénéficient d\'un support prioritaire 7j/7.',
      open: false,
    },
  ];

  toggleFaq(item: FaqItem): void {
    item.open = !item.open;
  }
}
