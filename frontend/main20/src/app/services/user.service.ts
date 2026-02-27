import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export type NotificationPreference = boolean | { email?: boolean; inApp?: boolean };

export interface UserMe {
  _id: string;
  email: string;
  role: string;
  nom: string;
  prenom: string;
  telephone: string;
  avatar?: string;
  adresseLivraison?: string;
  isEmailVerified: boolean;
  preferences: {
    notifications: NotificationPreference;
  };
  isActive: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
  panierId?: string;
  boutiqueId?: string;
}

export interface BoutiqueMe {
  _id: string;
  userId: string;
  nom: string;
  description?: string;
  logo?: string;
  banner?: string;
  adresse?: string;
  horaires?: unknown[];
  clickCollectActif?: boolean;
  telephone?: string;
  email?: string;
  plage_livraison_boutique?: unknown[];
  status?: string;
  statusLivreur?: string;
  accepteLivraisonJourJ?: boolean;
  isActive?: boolean;
  noteMoyenne?: number;
  nombreAvis?: number;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  dateValidation?: string;
  boxId?: string;
}

export interface PanierMe {
  _id: string;
  clientId: string;
  items: unknown[];
  updatedAt: string;
  expiresAt: string;
  __v?: number;
}

export interface UserMeData {
  user: UserMe;
  boutique: BoutiqueMe | null;
  panier: PanierMe | null;
}

export interface UpdateMePayload {
  nom?: string;
  prenom?: string;
  telephone?: string;
  avatar?: string;
  adresseLivraison?: string;
  preferences?: {
    notifications?: {
      email?: boolean;
      inApp?: boolean;
    };
  };
}

export type UpdateMeResponse = UserMeData | { user: UserMe };

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiRootUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMe(): Observable<ApiResponse<UserMeData>> {
    return this.http.get<ApiResponse<UserMeData>>(`${this.apiRootUrl}/users/me`);
  }

  updateMe(payload: UpdateMePayload): Observable<ApiResponse<UpdateMeResponse>> {
    return this.http.patch<ApiResponse<UpdateMeResponse>>(`${this.apiRootUrl}/users/me`, payload);
  }
}
