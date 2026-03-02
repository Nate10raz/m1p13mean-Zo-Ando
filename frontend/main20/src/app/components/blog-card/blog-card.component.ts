import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { CommonModule } from '@angular/common';
import { CartService } from 'src/app/services/cart.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

// ecommerce card
export interface ProductCard {
  id: string | number;
  imgSrc: string;
  title: string;
  price: number;
  rprice?: number;
  boutique?: string;
  boutiqueId?: string;
  categorieId?: string;
  categorieNom?: string;
  description?: string;
  stock?: number;
  rating?: number;
  createdAt?: string;
  boutiqueStatus?: {
    isOpen?: boolean;
    statusReason?: string | null;
  };
}

@Component({
  selector: 'app-blog-card',
  imports: [
    MatCardModule,
    TablerIconsModule,
    MatButtonModule,
    MatTooltipModule,
    RouterModule,
    StarRatingComponent,
    CommonModule,
  ],
  templateUrl: './blog-card.component.html',
  styleUrls: ['./blog-card.component.scss'],
})
export class AppBlogCardsComponent {
  constructor(
    private cartService: CartService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  onAddToCart(product: ProductCard, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.cartService.addToCart(product.id.toString()).subscribe({
      next: () => {
        this.snackBar
          .open(`${product.title} ajouté au panier !`, 'Voir le panier', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
          })
          .onAction()
          .subscribe(() => {
            this.router.navigate(['/panier']);
          });
      },
      error: (err) => {
        console.error('Add to cart failed', err);
        this.snackBar.open("Erreur lors de l'ajout au panier. Vérifiez votre connexion.", 'OK', {
          duration: 3000,
        });
      },
    });
  }

  @Input() productcards: ProductCard[] | null = null;
  @Input() showFallback = true;
  @Input() detailRouteBase: string | null = null;

  private readonly fallbackProductcards: ProductCard[] = [
    {
      id: 1,
      imgSrc: '/assets/images/products/s4.jpg',
      title: 'Boat Headphone',
      price: 285,
      rprice: 375,
      boutique: 'Boutique Demo',
    },
    {
      id: 2,
      imgSrc: '/assets/images/products/s5.jpg',
      title: 'MacBook Air Pro',
      price: 285,
      rprice: 375,
      boutique: 'Boutique Demo',
    },
    {
      id: 3,
      imgSrc: '/assets/images/products/s7.jpg',
      title: 'Red Valvet Dress',
      price: 285,
      rprice: 375,
      boutique: 'Boutique Demo',
    },
    {
      id: 4,
      imgSrc: '/assets/images/products/s11.jpg',
      title: 'Cute Soft Teddybear',
      price: 285,
      rprice: 375,
      boutique: 'Boutique Demo',
    },
  ];

  get cards(): ProductCard[] {
    if (this.productcards && this.productcards.length > 0) {
      return this.productcards;
    }
    return this.showFallback ? this.fallbackProductcards : [];
  }

  formatPrice(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '-';
    }
    const formatted = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
      Number(value),
    );
    return `Ar ${formatted}`;
  }
}
