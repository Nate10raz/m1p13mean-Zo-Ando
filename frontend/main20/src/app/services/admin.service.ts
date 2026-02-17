import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export type AdminUserStatus = 'active' | 'suspendue' | 'en_attente' | 'rejetee';
export type AdminBoutiqueStatus = AdminUserStatus;

export interface AdminUser {
  _id: string;
  email: string;
  role: string;
  nom: string;
  prenom: string;
  telephone: string;
  isEmailVerified: boolean;
  preferences: {
    notifications: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  panierId?: string;
  status?: AdminUserStatus;
  motifSuspension?: string;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'nom' | 'prenom' | 'status';
  sortDir?: 'asc' | 'desc';
  search?: string;
  status?: AdminUserStatus;
}

export interface AdminSuspendUserPayload {
  motif: string;
}

export interface AdminSuspendUserResponse {
  user: AdminUser & {
    status?: AdminUserStatus;
    motifSuspension?: string;
  };
}

export interface AdminReactivateUserResponse {
  user: AdminUser & {
    status?: AdminUserStatus;
  };
}

export interface AdminBoutiqueUser {
  _id: string;
  email: string;
  role: string;
  nom?: string;
  prenom?: string;
  telephone?: string;
  isActive?: boolean;
  createdAt?: string;
  status?: AdminBoutiqueStatus;
}

export interface AdminBoutique {
  _id: string;
  userId: string;
  nom: string;
  adresse: string;
  horaires: unknown[];
  clickCollectActif: boolean;
  telephone: string;
  plage_livraison_boutique: unknown[];
  status: AdminBoutiqueStatus;
  statusLivreur: string;
  accepteLivraisonJourJ: boolean;
  isActive: boolean;
  noteMoyenne: number;
  nombreAvis: number;
  createdAt: string;
  updatedAt: string;
  dateValidation?: string;
  motifSuspension?: string;
  user?: AdminBoutiqueUser;
}

export interface AdminBoutiquesResponse {
  items: AdminBoutique[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminBoutiquesQuery {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'nom' | 'status';
  sortDir?: 'asc' | 'desc';
  search?: string;
  includeUser?: boolean;
  status?: AdminBoutiqueStatus;
}

export interface AdminSuspendBoutiquePayload {
  motif: string;
}

export interface AdminSuspendBoutiqueResponse {
  boutique: AdminBoutique;
  user?: AdminBoutiqueUser;
}

export interface AdminReactivateBoutiqueResponse {
  boutique: AdminBoutique;
  user?: AdminBoutiqueUser;
}

export interface AdminApproveBoutiqueResponse {
  boutique: AdminBoutique;
  user?: AdminBoutiqueUser;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiRootUrl = environment.apiBaseUrl.replace(/\/auth\/?$/, '');

  constructor(private http: HttpClient) {}

  getUsers(params: AdminUsersQuery = {}): Observable<ApiResponse<AdminUsersResponse>> {
    return this.http.get<ApiResponse<AdminUsersResponse>>(`${this.apiRootUrl}/admin/users`, {
      params: this.buildParams(params),
    });
  }

  suspendUser(
    userId: string,
    payload: AdminSuspendUserPayload,
  ): Observable<ApiResponse<AdminSuspendUserResponse>> {
    return this.http.patch<ApiResponse<AdminSuspendUserResponse>>(
      `${this.apiRootUrl}/admin/users/${userId}/suspend`,
      payload,
    );
  }

  reactivateUser(userId: string): Observable<ApiResponse<AdminReactivateUserResponse>> {
    return this.http.patch<ApiResponse<AdminReactivateUserResponse>>(
      `${this.apiRootUrl}/admin/users/${userId}/reactivate`,
      {},
    );
  }

  getBoutiques(params: AdminBoutiquesQuery = {}): Observable<ApiResponse<AdminBoutiquesResponse>> {
    return this.http.get<ApiResponse<AdminBoutiquesResponse>>(
      `${this.apiRootUrl}/admin/boutiques`,
      {
        params: this.buildParams(params),
      },
    );
  }

  suspendBoutique(
    boutiqueId: string,
    payload: AdminSuspendBoutiquePayload,
  ): Observable<ApiResponse<AdminSuspendBoutiqueResponse>> {
    return this.http.patch<ApiResponse<AdminSuspendBoutiqueResponse>>(
      `${this.apiRootUrl}/admin/boutiques/${boutiqueId}/suspend`,
      payload,
    );
  }

  reactivateBoutique(boutiqueId: string): Observable<ApiResponse<AdminReactivateBoutiqueResponse>> {
    return this.http.patch<ApiResponse<AdminReactivateBoutiqueResponse>>(
      `${this.apiRootUrl}/admin/boutiques/${boutiqueId}/reactivate`,
      {},
    );
  }

  approveBoutique(boutiqueId: string): Observable<ApiResponse<AdminApproveBoutiqueResponse>> {
    return this.http.patch<ApiResponse<AdminApproveBoutiqueResponse>>(
      `${this.apiRootUrl}/admin/boutiques/${boutiqueId}/approve`,
      {},
    );
  }

  private buildParams(params: AdminUsersQuery): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      httpParams = httpParams.set(key, String(value));
    });

    return httpParams;
  }
}
