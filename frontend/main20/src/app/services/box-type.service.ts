import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export interface BoxTypeEntity {
  _id: string;
  nom: string;
  description?: string;
  caracteristiques?: Array<{ nom: string; valeur: string }>;
  estActif?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoxTypeListResponse {
  items: BoxTypeEntity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BoxTypeListQuery {
  page?: number;
  limit?: number;
  search?: string;
  estActif?: boolean;
}

export interface BoxTypeCreatePayload {
  nom: string;
  description?: string;
  caracteristiques?: Array<{ nom: string; valeur: string }>;
  estActif?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BoxTypeService {
  private readonly apiRootUrl = environment.apiBaseUrl.replace(/\/auth\/?$/, '');

  constructor(private http: HttpClient) {}

  createBoxType(payload: BoxTypeCreatePayload): Observable<ApiResponse<BoxTypeEntity>> {
    return this.http.post<ApiResponse<BoxTypeEntity>>(`${this.apiRootUrl}/box-types`, payload);
  }

  listBoxTypes(params: BoxTypeListQuery = {}): Observable<ApiResponse<BoxTypeListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.search) queryParams.set('search', params.search);
    if (params.estActif !== undefined) queryParams.set('estActif', String(params.estActif));

    const suffix = queryParams.toString();
    const url = suffix ? `${this.apiRootUrl}/box-types?${suffix}` : `${this.apiRootUrl}/box-types`;
    return this.http.get<ApiResponse<BoxTypeListResponse>>(url);
  }
}
