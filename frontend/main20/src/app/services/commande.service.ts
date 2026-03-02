import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Commande {
  _id: string;
  numeroCommande: string;
  clientId: any;
  clientInfo?: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
  };
  fraisLivraison?: {
    montant: number;
    valeur: number;
    type: 'fixe' | 'pourcentage';
  };
  total: number;
  baseTotal: number;
  typedelivery: string;
  statusLivraison: string;
  createdAt: string;
  updatedAt?: string;
  boutiques: any[];
  adresseLivraison: string;
  dateDeliveryOrAbleCollect?: string;
  notes?: string;
  paiement: {
    methode: string;
    statut: string;
    montantPaye?: number;
    transactionId?: string;
  };
  validationCollection?: any;
  validationLivraison?: any;
}

@Injectable({
  providedIn: 'root',
})
export class CommandeService {
  private apiUrl = `${environment.apiUrl}/commande`;

  constructor(private http: HttpClient) { }

  createCommande(deliveryData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, deliveryData);
  }

  getMyCommandes(): Observable<{ success: boolean; data: Commande[] }> {
    return this.http.get<{ success: boolean; data: Commande[] }>(`${this.apiUrl}/my`);
  }

  getBoutiqueCommandes(): Observable<{ success: boolean; data: Commande[] }> {
    return this.http.get<{ success: boolean; data: Commande[] }>(`${this.apiUrl}/boutique/all`);
  }

  getAllCommandes(): Observable<{ success: boolean; data: Commande[] }> {
    return this.http.get<{ success: boolean; data: Commande[] }>(`${this.apiUrl}/admin/all`);
  }

  getCommandeById(id: string): Observable<{ success: boolean; data: Commande }> {
    return this.http.get<{ success: boolean; data: Commande }>(`${this.apiUrl}/${id}`);
  }

  // Actions
  acceptOrder(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/boutique/accept/${id}`, {});
  }

  markDepot(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/boutique/mark-depot/${id}`, {});
  }

  startBoutiqueDelivery(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/boutique/start-delivery/${id}`, {});
  }

  confirmDepot(id: string, boutiqueId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/confirm-depot/${id}`, { boutiqueId });
  }

  cancelOrder(id: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cancel/${id}`, { reason });
  }

  cancelItem(id: string, produitId: string, boutiqueId: string, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cancel-item/${id}/${produitId}`, { boutiqueId, reason });
  }

  confirmFinal(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm-receipt/${id}`, {});
  }
}

