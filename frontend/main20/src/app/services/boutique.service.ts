import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export interface BoutiqueHoraire {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  ouverture: string;
  fermeture: string;
}

export interface BoutiquePlageLivraison {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  ouverture: string;
  fermeture: string;
  maxLivraison: number;
}

export interface Boutique {
  _id: string;
  userId: string;
  nom: string;
  description?: string;
  logo?: string;
  banner?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  horaires: BoutiqueHoraire[];
  clickCollectActif: boolean;
  plage_livraison_boutique: BoutiquePlageLivraison[];
  accepteLivraisonJourJ: boolean;
  status: 'en_attente' | 'active' | 'suspendue' | 'rejetee';
  statusLivreur?: string;
  noteMoyenne: number;
  nombreAvis: number;
  dateValidation?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class BoutiqueService {
  private readonly apiRootUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMyBoutique(): Observable<ApiResponse<Boutique>> {
    return this.http.get<ApiResponse<Boutique>>(`${this.apiRootUrl}/boutiques/me`);
  }

  updateMyBoutique(data: Partial<Boutique>): Observable<ApiResponse<Boutique>> {
    return this.http.patch<ApiResponse<Boutique>>(`${this.apiRootUrl}/boutiques/me`, data);
  }

  getBoutiqueById(id: string): Observable<ApiResponse<Boutique>> {
    return this.http.get<ApiResponse<Boutique>>(`${this.apiRootUrl}/boutiques/${id}`);
  }

  updateBoutique(id: string, data: Partial<Boutique>): Observable<ApiResponse<Boutique>> {
    return this.http.put<ApiResponse<Boutique>>(`${this.apiRootUrl}/boutiques/${id}`, data);
  }
}
