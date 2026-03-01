import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { TablerIconsModule } from 'angular-tabler-icons';
import { finalize } from 'rxjs';

import {
  LandingProductsResponse,
  ProductCreateResponse,
  ProductService,
} from 'src/app/services/product.service';
import { UserService, UserMeData } from 'src/app/services/user.service';

type LandingProductCategory = 'bestSeller' | 'newest' | 'others';
type LandingCategoryKey = 'all' | LandingProductCategory;

interface LandingProductCard {
  id: string;
  name: string;
  boutique: string;
  price: string;
  rating: string;
  image: string;
  badge?: string;
  badgeClass?: string;
  category: LandingProductCategory;
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
export class LandingComponent implements OnInit {
  constructor(
    private productService: ProductService,
    private userService: UserService,
  ) {}

  currentYear = new Date().getFullYear();
  isAuthenticated = false;
  profileName = 'Utilisateur';
  userRole: string | null = null;

  // ─── Hero : 2 stats sobres (pas de chiffres excessifs) ────────────
  heroStats = [
    { key: 'boutiques', value: '500+', label: 'Boutiques actives' },
    { key: 'acheteurs', value: '12 000+', label: 'Acheteurs inscrits' },
  ];

  // ─── Hero card preview ────────────────────────────────────────────
  heroPreviewProducts = [
    {
      id: 1,
      name: 'Sac artisanal',
      price: '35 000 Ar',
      icon: 'shopping-bag',
      bg: 'rgba(93,135,255,0.18)',
      stock: '75%',
    },
    {
      id: 2,
      name: 'Tissu soie',
      price: '18 000 Ar',
      icon: 'sparkles',
      bg: 'rgba(68,183,247,0.18)',
      stock: '45%',
    },
    {
      id: 3,
      name: 'Chaussures',
      price: '52 000 Ar',
      icon: 'circle-dot',
      bg: 'rgba(19,222,185,0.18)',
      stock: '88%',
    },
  ];

  // ─── Réseaux sociaux footer ───────────────────────────────────────
  socials = [
    { icon: 'brand-facebook', url: '#' },
    { icon: 'brand-instagram', url: '#' },
    { icon: 'brand-x', url: '#' },
  ];

  // ─── Filtres produits — sans icônes, plus légers ──────────────────
  // Produits landing - best seller, newest, others
  categories: Array<{ key: LandingCategoryKey; label: string }> = [
    { key: 'all', label: 'Tout' },
    { key: 'bestSeller', label: 'Plus vendu' },
    { key: 'newest', label: 'Nouveau' },
    { key: 'others', label: 'Autres' },
  ];

  activeCategory: LandingCategoryKey = 'all';
  landingProducts: LandingProductCard[] = [];
  isLoadingProducts = false;
  productsError = '';

  private readonly fallbackImages = [
    'assets/images/products/product-1.png',
    'assets/images/products/product-2.png',
    'assets/images/products/product-3.png',
    'assets/images/products/product-4.png',
    'assets/images/products/product-5.png',
    'assets/images/products/product-6.png',
  ];

  ngOnInit(): void {
    this.loadLandingProducts();
    this.loadCurrentUser();
  }

  get displayedProducts(): LandingProductCard[] {
    if (this.activeCategory === 'all') {
      return this.landingProducts.slice(0, 6);
    }
    return this.landingProducts.filter((p) => p.category === this.activeCategory).slice(0, 6);
  }

  voirProduit(prod: LandingProductCard): void {
    console.log('Voir produit:', prod.name);
  }

  get userHomeRoute(): string {
    if (!this.isAuthenticated) {
      return '/client/login';
    }
    const role = (this.userRole ?? '').toLowerCase();
    if (role === 'client') {
      return '/accueil';
    }
    if (role === 'admin' || role === 'boutique') {
      return '/dashboard';
    }
    return '/profil';
  }

  get homeCtaLabel(): string {
    if (!this.isAuthenticated) {
      return 'Voir tous les produits';
    }
    const role = (this.userRole ?? '').toLowerCase();
    return role === 'client' ? 'Aller a mon espace' : 'Acceder au tableau de bord';
  }

  private loadLandingProducts(limit = 6): void {
    this.isLoadingProducts = true;
    this.productsError = '';

    this.productService
      .getLandingProducts(limit)
      .pipe(
        finalize(() => {
          this.isLoadingProducts = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.landingProducts = this.mapLandingResponse(response?.data);
        },
        error: (error) => {
          this.productsError = error?.error?.message ?? 'Impossible de charger les produits.';
          this.landingProducts = [];
        },
      });
  }

  private loadCurrentUser(): void {
    this.userService.getMe({ silent: true }).subscribe({
      next: (response) => {
        const data = response?.data as UserMeData | undefined;
        const user = data?.user;
        if (!user) {
          this.isAuthenticated = false;
          this.userRole = null;
          this.profileName = 'Utilisateur';
          return;
        }

        this.isAuthenticated = true;
        this.userRole = user.role ?? null;
        this.profileName = this.resolveProfileName(user);
      },
      error: () => {
        this.isAuthenticated = false;
        this.userRole = null;
        this.profileName = 'Utilisateur';
      },
    });
  }

  private mapLandingResponse(
    data: LandingProductsResponse | null | undefined,
  ): LandingProductCard[] {
    if (!data) {
      return [];
    }

    const result: LandingProductCard[] = [];
    const seen = new Set<string>();

    const push = (
      item: ProductCreateResponse | null | undefined,
      category: LandingProductCategory,
    ) => {
      if (!item?._id || seen.has(item._id)) {
        return;
      }
      seen.add(item._id);
      result.push(this.mapLandingProduct(item, category, result.length));
    };

    push(data.bestSeller, 'bestSeller');
    push(data.newest, 'newest');

    for (const item of data.others ?? []) {
      if (result.length >= (data.limit ?? 6)) {
        break;
      }
      push(item, 'others');
    }

    return result;
  }

  private mapLandingProduct(
    item: ProductCreateResponse,
    category: LandingProductCategory,
    index: number,
  ): LandingProductCard {
    const images = item.images ?? [];
    const main = images.find((img) => img.isMain) ?? images[0];
    const fallbackImage = this.fallbackImages[index % this.fallbackImages.length];
    const boutiqueLabel = item.boutique?.nom ?? item.boutiqueId ?? 'Boutique';

    const badge =
      category === 'bestSeller' ? 'Plus vendu' : category === 'newest' ? 'Nouveau' : undefined;
    const badgeClass =
      category === 'bestSeller'
        ? 'bg-light-primary text-primary'
        : category === 'newest'
          ? 'bg-light-warning text-warning'
          : undefined;

    return {
      id: item._id,
      name: item.titre,
      boutique: boutiqueLabel,
      price: this.formatPrice(item.prixBaseActuel),
      rating: this.formatRating(item.noteMoyenne),
      image: main?.url ?? fallbackImage,
      badge,
      badgeClass,
      category,
    };
  }

  private formatPrice(value: number | undefined | null): string {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return '-';
    }
    return `${new Intl.NumberFormat('fr-FR').format(num)} Ar`;
  }

  private formatRating(value: number | undefined | null): string {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) {
      return '0.0';
    }
    return num.toFixed(1);
  }

  private resolveProfileName(user?: {
    prenom?: string | null;
    nom?: string | null;
    email?: string | null;
  }): string {
    if (!user) {
      return 'Utilisateur';
    }
    const prenom = (user.prenom ?? '').trim();
    const nom = (user.nom ?? '').trim();
    const full = [prenom, nom].filter(Boolean).join(' ');
    if (full) {
      return full;
    }
    return (user.email ?? '').trim() || 'Utilisateur';
  }

  // Comment ca marche
  howTab: 'acheteur' | 'vendeur' = 'acheteur';

  stepsAcheteur: HowStep[] = [
    {
      num: '01',
      icon: 'user-plus',
      title: 'Créez votre compte',
      desc: "Inscription gratuite en moins de 2 minutes. Email, nom, mot de passe — c'est tout.",
    },
    {
      num: '02',
      icon: 'search',
      title: 'Explorez les boutiques',
      desc: 'Parcourez des centaines de boutiques et de produits classés par catégorie.',
    },
    {
      num: '03',
      icon: 'shopping-cart',
      title: 'Commandez en toute sécurité',
      desc: 'Ajoutez au panier, payez en ligne et suivez votre commande en temps réel.',
    },
  ];

  stepsVendeur: HowStep[] = [
    {
      num: '01',
      icon: 'file-text',
      title: 'Demandez une box',
      desc: 'Choisissez votre espace commercial dans le centre et soumettez votre demande.',
    },
    {
      num: '02',
      icon: 'building-store',
      title: 'Ouvrez votre boutique',
      desc: 'Une fois approuvé, créez votre boutique et ajoutez vos produits facilement.',
    },
    {
      num: '03',
      icon: 'chart-bar',
      title: 'Vendez & suivez vos stats',
      desc: 'Gérez vos commandes, stocks et revenus depuis votre tableau de bord dédié.',
    },
  ];

  // ─── Tarifs ───────────────────────────────────────────────────────
  plans: PricingPlan[] = [
    {
      key: 'acheteur',
      name: 'Acheteur',
      price: 'Gratuit',
      desc: 'Pour tous ceux qui souhaitent acheter dans notre centre commercial.',
      features: [
        'Accès à toutes les boutiques',
        'Panier & commandes illimités',
        'Suivi de commande en temps réel',
        "Historique d'achats complet",
        'Avis et notations',
      ],
      cta: 'Créer un compte gratuit',
      icon: 'shopping-bag',
      iconClass: 'bg-light-primary text-primary',
      featured: false,
    },
    {
      key: 'vendeur',
      name: 'Vendeur Standard',
      price: '150 000 Ar',
      period: '/ mois',
      desc: 'Pour les entrepreneurs qui veulent démarrer leur activité dans notre marché.',
      features: [
        "Location d'une box commerciale",
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
      key: 'premium',
      name: 'Vendeur Premium',
      price: '280 000 Ar',
      period: '/ mois',
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

  // ─── 3 témoignages (pas 4) ────────────────────────────────────────
  testimonials: Testimonial[] = [
    {
      id: 1,
      quote:
        "Depuis que j'ai ouvert ma boutique ici, mes ventes ont augmenté de 60%. La plateforme est vraiment intuitive.",
      name: 'Miora Rakotondrabe',
      initials: 'MR',
      role: 'Vendeuse · Vêtements & Accessoires',
      featured: true,
    },
    {
      id: 2,
      quote:
        "Je fais tous mes achats du mois ici. C'est pratique, les prix sont bons et les vendeurs sont sérieux.",
      name: 'Hery Andriantsoa',
      initials: 'HA',
      role: 'Acheteur fidèle',
      featured: false,
    },
    {
      id: 3,
      quote:
        'Le tableau de bord est excellent. Je peux gérer toute ma boutique depuis mon téléphone.',
      name: 'Fanja Razafindrakoto',
      initials: 'FR',
      role: 'Vendeur · Électronique',
      featured: false,
    },
  ];

  // ─── FAQ ──────────────────────────────────────────────────────────
  faqs: FaqItem[] = [
    {
      id: 1,
      question: "Comment s'inscrire sur la plateforme ?",
      answer:
        'L\'inscription est gratuite et prend moins de 2 minutes. Cliquez sur "Commencer gratuitement", renseignez vos informations et vous êtes prêt à acheter ou à soumettre une demande de box.',
      open: true,
    },
    {
      id: 2,
      question: 'Comment louer une box pour vendre mes produits ?',
      answer:
        'Une fois inscrit, rendez-vous dans "Demande de location". Sélectionnez la box qui vous convient (zone, étage, superficie). Votre demande sera traitée sous 48h ouvrables.',
      open: false,
    },
    {
      id: 3,
      question: 'Quels moyens de paiement sont acceptés ?',
      answer:
        'Nous acceptons MVola, Orange Money, Airtel Money, les virements bancaires BNI et BOA. Le paiement en ligne est sécurisé et toutes les transactions sont chiffrées.',
      open: false,
    },
    {
      id: 4,
      question: 'Puis-je gérer plusieurs boutiques avec un seul compte ?',
      answer:
        'Oui, chaque compte vendeur peut gérer plusieurs boxes depuis un seul tableau de bord. Vous pouvez louer plusieurs espaces et tout centraliser en un seul endroit.',
      open: false,
    },
    {
      id: 5,
      question: 'Comment contacter le support en cas de problème ?',
      answer:
        "Notre équipe est disponible par email, téléphone et via la messagerie intégrée dans votre espace client. Les abonnés Premium bénéficient d'un support prioritaire 7j/7.",
      open: false,
    },
  ];

  toggleFaq(item: FaqItem): void {
    item.open = !item.open;
  }
}
