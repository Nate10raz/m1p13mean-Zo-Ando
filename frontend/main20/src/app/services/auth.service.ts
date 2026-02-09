import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClientRegisterPayload {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone: string;
}

export interface ApiResponse<T> {
  route: string;
  status: number;
  message: string;
  date: string;
  data: T;
}

export interface UserEntity {
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
}

export interface ClientRegisterData {
  user: UserEntity;
  panier: {
    _id: string;
    clientId: string;
    items: unknown[];
    updatedAt: string;
    expiresAt: string;
  };
}

export interface BoutiqueRegisterPayload extends ClientRegisterPayload {
  boutique: {
    nom: string;
    adresse: string;
    telephone: string;
  };
}

export interface BoutiqueRegisterData {
  user: UserEntity;
  boutique: {
    _id: string;
    nom: string;
    adresse: string;
    telephone: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiBaseUrl = 'http://localhost:3000/auth';

  constructor(private http: HttpClient) {}

  registerClient(payload: ClientRegisterPayload): Observable<ApiResponse<ClientRegisterData>> {
    return this.http.post<ApiResponse<ClientRegisterData>>(`${this.apiBaseUrl}/register/client`, payload);
  }

  registerBoutique(payload: BoutiqueRegisterPayload): Observable<ApiResponse<BoutiqueRegisterData>> {
    return this.http.post<ApiResponse<BoutiqueRegisterData>>(`${this.apiBaseUrl}/register/boutique`, payload);
  }
}
