import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export interface DemandeLocationBoxPayload {
  boxId: string;
  dateDebut: string;
}

export interface DemandeLocationBoxEntity {
  _id: string;
  boutiqueId: string | { _id?: string; nom?: string };
  boxId: string | { _id?: string; numero?: string };
  dateDebut: string;
  status: 'en_attente' | 'validee' | 'rejetee' | 'annulee';
  adminId?: string;
  dateValidation?: string;
  motif?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DemandeLocationBoxListResponse {
  items: DemandeLocationBoxEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DemandeLocationBoxQuery {
  page?: number;
  limit?: number;
  status?: DemandeLocationBoxEntity['status'];
  boxId?: string;
  boutiqueId?: string;
}

export interface DemandeLocationBoxActionPayload {
  commentaire: string;
}

@Injectable({
  providedIn: 'root',
})
export class DemandeLocationBoxService {
  private readonly apiRootUrl = environment.apiBaseUrl.replace(/\/auth\/?$/, '');

  constructor(private http: HttpClient) {}

  createDemande(payload: DemandeLocationBoxPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(
      `${this.apiRootUrl}/demandes-location-box`,
      payload,
    );
  }

  listDemandes(
    params: DemandeLocationBoxQuery = {},
  ): Observable<ApiResponse<DemandeLocationBoxListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.status) queryParams.set('status', params.status);
    if (params.boxId) queryParams.set('boxId', params.boxId);
    if (params.boutiqueId) queryParams.set('boutiqueId', params.boutiqueId);

    const suffix = queryParams.toString();
    const url = suffix
      ? `${this.apiRootUrl}/demandes-location-box?${suffix}`
      : `${this.apiRootUrl}/demandes-location-box`;
    return this.http.get<ApiResponse<DemandeLocationBoxListResponse>>(url);
  }

  listPending(params: { page?: number; limit?: number } = {}): Observable<ApiResponse<DemandeLocationBoxListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));

    const suffix = queryParams.toString();
    const url = suffix
      ? `${this.apiRootUrl}/demandes-location-box/pending?${suffix}`
      : `${this.apiRootUrl}/demandes-location-box/pending`;
    return this.http.get<ApiResponse<DemandeLocationBoxListResponse>>(url);
  }

  listMyDemandes(params: { page?: number; limit?: number; status?: DemandeLocationBoxEntity['status'] } = {}): Observable<ApiResponse<DemandeLocationBoxListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.status) queryParams.set('status', params.status);

    const suffix = queryParams.toString();
    const url = suffix
      ? `${this.apiRootUrl}/demandes-location-box/me?${suffix}`
      : `${this.apiRootUrl}/demandes-location-box/me`;
    return this.http.get<ApiResponse<DemandeLocationBoxListResponse>>(url);
  }

  cancelDemande(id: string): Observable<ApiResponse<DemandeLocationBoxEntity>> {
    return this.http.patch<ApiResponse<DemandeLocationBoxEntity>>(
      `${this.apiRootUrl}/demandes-location-box/${id}/cancel`,
      {},
    );
  }

  approveDemande(
    id: string,
    payload: DemandeLocationBoxActionPayload,
  ): Observable<ApiResponse<DemandeLocationBoxEntity>> {
    return this.http.patch<ApiResponse<DemandeLocationBoxEntity>>(
      `${this.apiRootUrl}/demandes-location-box/${id}/approve`,
      payload,
    );
  }

  rejectDemande(
    id: string,
    payload: DemandeLocationBoxActionPayload,
  ): Observable<ApiResponse<DemandeLocationBoxEntity>> {
    return this.http.patch<ApiResponse<DemandeLocationBoxEntity>>(
      `${this.apiRootUrl}/demandes-location-box/${id}/reject`,
      payload,
    );
  }
}
