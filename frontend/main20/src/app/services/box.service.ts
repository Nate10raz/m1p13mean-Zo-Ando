import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export interface BoxCaracteristique {
  nom: string;
  valeur: string;
}

export interface BoxCreatePayload {
  numero: string;
  etage: number;
  zone: string;
  allee?: string;
  position?: string;
  description?: string;
  caracteristiques?: BoxCaracteristique[];
  photos?: string[];
  superficie: number;
  typeId: string;
  montant: number;
  unite: 'mois' | 'annee';
  dateDebut: string;
  raison?: string;
}

export interface BoxTarifPayload {
  montant: number;
  unite: 'mois' | 'annee';
  dateDebut: string;
  raison?: string;
}

export interface BoxEntity {
  _id: string;
  numero: string;
  etage: number;
  zone: string;
  allee?: string;
  position?: string;
  description?: string;
  caracteristiques?: BoxCaracteristique[];
  photos?: string[];
  superficie: number;
  typeId: string | { _id: string; nom?: string };
  tarifActuel?: {
    montant?: number;
    unite?: 'mois' | 'annee';
    dateDebut?: string;
  };
  estOccupe?: boolean;
  boutiqueId?: string | { _id: string; nom?: string };
  contrat?: {
    dateDebut?: string;
    dateFin?: string;
    reference?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface BoxListResponse {
  items: BoxEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BoxListQuery {
  page?: number;
  limit?: number;
  search?: string;
  zone?: string;
  etage?: number;
  typeId?: string;
  estOccupe?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BoxService {
  private readonly apiRootUrl = environment.apiBaseUrl.replace(/\/auth\/?$/, '');

  constructor(private http: HttpClient) {}

  createBox(payload: BoxCreatePayload): Observable<ApiResponse<BoxEntity>> {
    return this.http.post<ApiResponse<BoxEntity>>(`${this.apiRootUrl}/boxes`, payload);
  }

  listBoxes(params: BoxListQuery = {}): Observable<ApiResponse<BoxListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.search) queryParams.set('search', params.search);
    if (params.zone) queryParams.set('zone', params.zone);
    if (params.etage !== undefined) queryParams.set('etage', String(params.etage));
    if (params.typeId) queryParams.set('typeId', params.typeId);
    if (params.estOccupe !== undefined) queryParams.set('estOccupe', String(params.estOccupe));

    const suffix = queryParams.toString();
    const url = suffix ? `${this.apiRootUrl}/boxes?${suffix}` : `${this.apiRootUrl}/boxes`;
    return this.http.get<ApiResponse<BoxListResponse>>(url);
  }

  listAvailableBoxes(params: Omit<BoxListQuery, 'estOccupe'> = {}): Observable<ApiResponse<BoxListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.search) queryParams.set('search', params.search);
    if (params.zone) queryParams.set('zone', params.zone);
    if (params.etage !== undefined) queryParams.set('etage', String(params.etage));
    if (params.typeId) queryParams.set('typeId', params.typeId);

    const suffix = queryParams.toString();
    const url = suffix
      ? `${this.apiRootUrl}/boxes/available?${suffix}`
      : `${this.apiRootUrl}/boxes/available`;
    return this.http.get<ApiResponse<BoxListResponse>>(url);
  }

  listMyBoxes(params: BoxListQuery = {}): Observable<ApiResponse<BoxListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.search) queryParams.set('search', params.search);
    if (params.zone) queryParams.set('zone', params.zone);
    if (params.etage !== undefined) queryParams.set('etage', String(params.etage));
    if (params.typeId) queryParams.set('typeId', params.typeId);
    if (params.estOccupe !== undefined) queryParams.set('estOccupe', String(params.estOccupe));

    const suffix = queryParams.toString();
    const url = suffix ? `${this.apiRootUrl}/boxes/me?${suffix}` : `${this.apiRootUrl}/boxes/me`;
    return this.http.get<ApiResponse<BoxListResponse>>(url);
  }

  getBoxById(id: string): Observable<ApiResponse<BoxEntity>> {
    return this.http.get<ApiResponse<BoxEntity>>(`${this.apiRootUrl}/boxes/${id}`);
  }

  updateBoxTarif(id: string, payload: BoxTarifPayload): Observable<ApiResponse<BoxEntity>> {
    return this.http.patch<ApiResponse<BoxEntity>>(`${this.apiRootUrl}/boxes/${id}/tarif`, payload);
  }
}
