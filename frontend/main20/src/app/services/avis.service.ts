import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Avis {
  _id: string;
  type: 'produit' | 'boutique';
  produitId?: any;
  boutiqueId: any;
  clientId: any;
  note: number;
  commentaire: string;
  titre: string;
  reponses?: Array<{
    message: string;
    dateReponse: string;
    userId: string;
    boutiqueId?: string;
    roleRepondant: 'admin' | 'boutique';
    prenomRepondant?: string;
    nomBoutique?: string;
  }>;
  estSignale: boolean;
  statutSignalement: 'aucun' | 'en_attente' | 'valide' | 'rejete';
  signalements?: Array<{
    userId: any;
    raison: string;
    date: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class AvisService {
  private readonly apiUrl = `${environment.apiUrl}/avis`;

  constructor(private http: HttpClient) { }

  createAvis(payload: {
    type: 'produit' | 'boutique';
    produitId?: string;
    boutiqueId: string;
    note: number;
    titre?: string;
    commentaire?: string;
  }): Observable<Avis> {
    return this.http.post<Avis>(this.apiUrl, payload);
  }

  getByEntity(type: 'produit' | 'boutique', id: string): Observable<Avis[]> {
    return this.http.get<Avis[]>(`${this.apiUrl}/${type}/${id}`);
  }

  addReponse(avisId: string, message: string): Observable<Avis> {
    return this.http.post<Avis>(`${this.apiUrl}/${avisId}/reponse`, { message });
  }

  reportAvis(avisId: string, raison: string): Observable<Avis> {
    return this.http.post<Avis>(`${this.apiUrl}/${avisId}/signalement`, { raison });
  }

  // Admin
  getSignaledAvis(): Observable<Avis[]> {
    return this.http.get<Avis[]>(`${this.apiUrl}/admin/signales`);
  }

  handleSignalement(avisId: string, action: 'accepter' | 'rejeter'): Observable<Avis> {
    return this.http.patch<Avis>(`${this.apiUrl}/admin/${avisId}/signalement`, { action });
  }
}
