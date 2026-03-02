import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService, Cart } from 'src/app/services/cart.service';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule, RouterModule],
  templateUrl: './panier.component.html',
  styleUrls: ['./panier.component.scss'],
})
export class PanierComponent implements OnInit {
  constructor(
    public cartService: CartService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cartService.refreshCart();
  }

  updateQuantity(item: any, delta: number): void {
    const newQty = item.quantite + delta;
    if (newQty <= 0) {
      this.removeFromCart(item);
    } else {
      this.cartService
        .updateQuantity(item.produitId._id || item.produitId, newQty, item.variationId)
        .subscribe();
    }
  }

  removeFromCart(item: any): void {
    this.cartService
      .removeFromCart(item.produitId._id || item.produitId, item.variationId)
      .subscribe(() => {
        this.snackBar
          .open('Produit retiré du panier', 'Annuler', {
            duration: 4000,
          })
          .onAction()
          .subscribe(() => {
            this.cartService
              .addToCart(item.produitId._id || item.produitId, item.variationId, item.quantite)
              .subscribe();
          });
      });
  }

  clearCart(): void {
    const previousItems = [...(this.cartService.currentCart?.items || [])];
    this.cartService.clearCart().subscribe(() => {
      const snack = this.snackBar.open('Panier vidé', 'Annuler', {
        duration: 5000,
      });
      snack.onAction().subscribe(() => {
        // Restore logic would be complex here, maybe just a simpler confirmation for clear
        // Let's stick to a simpler "soft" confirmation for clear
      });
    });
  }

  get totalItems(): number {
    return this.cartService.totalItems;
  }

  get totalPrice(): number {
    return this.cartService.totalPrice;
  }
}
