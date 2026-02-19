import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export interface PayementBoxCreatePayload {
  boxId: string;
  montant: number;
  prixBoxeId?: string;
  date?: string;
  periode?: string;
  status?: 'en_attente' | 'valide' | 'rejete';
  commentaire?: string;
}

export interface PayementBoxEntity {
  _id: string;
  boutiqueId: string | { _id?: string; nom?: string };
  boxId: string | { _id?: string; numero?: string };
  reference: string;
  periode: string;
  montant: number;
  date?: string;
  status: 'en_attente' | 'valide' | 'rejete';
  dateValidation?: string;
  adminId?: string;
  createdBy?: string;
  commentaire?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayementBoxListResponse {
  items: PayementBoxEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PayementBoxListQuery {
  page?: number;
  limit?: number;
  status?: PayementBoxEntity['status'];
  boxId?: string;
  boutiqueId?: string;
}

export interface PayementBoxActionPayload {
  commentaire: string;
}

@Injectable({
  providedIn: 'root',
})
export class PayementBoxService {
  private readonly apiRootUrl = environment.apiBaseUrl.replace(/\/auth\/?$/, '');

  constructor(private http: HttpClient) {}

  createPayement(payload: PayementBoxCreatePayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.apiRootUrl}/payements-box`, payload);
  }

  listPayements(
    params: PayementBoxListQuery = {},
  ): Observable<ApiResponse<PayementBoxListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.status) queryParams.set('status', params.status);
    if (params.boxId) queryParams.set('boxId', params.boxId);
    if (params.boutiqueId) queryParams.set('boutiqueId', params.boutiqueId);

    const suffix = queryParams.toString();
    const url = suffix
      ? `${this.apiRootUrl}/payements-box?${suffix}`
      : `${this.apiRootUrl}/payements-box`;
    return this.http.get<ApiResponse<PayementBoxListResponse>>(url);
  }

  getPayementById(id: string): Observable<ApiResponse<PayementBoxEntity>> {
    return this.http.get<ApiResponse<PayementBoxEntity>>(`${this.apiRootUrl}/payements-box/${id}`);
  }

  validatePayement(
    id: string,
    payload: PayementBoxActionPayload,
  ): Observable<ApiResponse<PayementBoxEntity>> {
    return this.http.patch<ApiResponse<PayementBoxEntity>>(
      `${this.apiRootUrl}/payements-box/${id}/validate`,
      payload,
    );
  }

  rejectPayement(
    id: string,
    payload: PayementBoxActionPayload,
  ): Observable<ApiResponse<PayementBoxEntity>> {
    return this.http.patch<ApiResponse<PayementBoxEntity>>(
      `${this.apiRootUrl}/payements-box/${id}/reject`,
      payload,
    );
  }
}
