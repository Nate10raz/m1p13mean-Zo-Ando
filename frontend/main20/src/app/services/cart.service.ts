import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface CartItem {
  produitId: any; // Populated or ID
  variationId?: string;
  boutiqueId: any;
  quantite: number;
  prixUnitaire: number;
  nomProduit: string;
  imageProduit: string;
}

export interface Cart {
  _id: string;
  clientId: string;
  items: CartItem[];
  status: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/panier`;
  private cartSubject = new BehaviorSubject<Cart | null>(null);
  public cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refreshCart();
  }

  get currentCart(): Cart | null {
    return this.cartSubject.value;
  }

  refreshCart(): void {
    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        this.cartSubject.next(res.data);
      },
      error: (err) => {
        console.error('Failed to fetch cart', err);
      },
    });
  }

  addToCart(produitId: string, variationId?: string, quantite: number = 1): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/add`, { produitId, variationId, quantite }).pipe(
      tap((res) => {
        this.cartSubject.next(res.data);
      }),
    );
  }

  updateQuantity(produitId: string, quantite: number, variationId?: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/update`, { produitId, variationId, quantite }).pipe(
      tap((res) => {
        this.cartSubject.next(res.data);
      }),
    );
  }

  removeFromCart(produitId: string, variationId?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/remove`, { produitId, variationId }).pipe(
      tap((res) => {
        this.cartSubject.next(res.data);
      }),
    );
  }

  clearCart(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/clear`).pipe(
      tap((res) => {
        this.cartSubject.next(res.data);
      }),
    );
  }

  get totalItems(): number {
    const cart = this.cartSubject.value;
    if (!cart) return 0;
    return cart.items.reduce((acc, item) => acc + item.quantite, 0);
  }

  get totalPrice(): number {
    const cart = this.cartSubject.value;
    if (!cart) return 0;
    return cart.items.reduce((acc, item) => acc + item.quantite * item.prixUnitaire, 0);
  }
}
