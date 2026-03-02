import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, mergeMap, of, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenService } from './token.service';

export interface ClientRegisterPayload {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone: string;
}

export interface LoginPayload {
  email: string;
  password: string;
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
  boutiqueId?: string;
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

export interface BoutiqueMeData {
  _id: string;
  userId: string;
  nom: string;
  adresse?: string;
  horaires?: unknown[];
  clickCollectActif?: boolean;
  telephone?: string;
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
}

export interface LoginData {
  user: UserEntity;
  accessToken: string;
}

export interface RefreshData {
  accessToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiBaseUrl = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
  ) {}

  getBoutiqueMe(): Observable<ApiResponse<BoutiqueMeData>> {
    return this.http.get<ApiResponse<BoutiqueMeData>>(`${environment.apiUrl}/boutiques/me`);
  }

  registerClient(payload: ClientRegisterPayload): Observable<ApiResponse<ClientRegisterData>> {
    return this.http.post<ApiResponse<ClientRegisterData>>(
      `${this.apiBaseUrl}/register/client`,
      payload,
    );
  }

  registerBoutique(
    payload: BoutiqueRegisterPayload,
  ): Observable<ApiResponse<BoutiqueRegisterData>> {
    return this.http.post<ApiResponse<BoutiqueRegisterData>>(
      `${this.apiBaseUrl}/register/boutique`,
      payload,
    );
  }

  login(payload: LoginPayload): Observable<ApiResponse<LoginData>> {
    return this.http
      .post<ApiResponse<LoginData>>(`${this.apiBaseUrl}/login`, payload, { withCredentials: true })
      .pipe(
        tap((response) => {
          const accessToken = response?.data?.accessToken;
          if (accessToken) {
            this.tokenService.setAccessToken(accessToken);
          }
          const user = response?.data?.user;
          if (user) {
            this.tokenService.setUser(user);
          }
        }),
      );
  }

  loginWithRole(payload: LoginPayload, expectedRole: string): Observable<ApiResponse<LoginData>> {
    const expected = expectedRole.toLowerCase().trim();
    return this.http
      .post<ApiResponse<LoginData>>(`${this.apiBaseUrl}/login`, payload, { withCredentials: true })
      .pipe(
        mergeMap((response) => {
          const role = response?.data?.user?.role?.toLowerCase().trim();
          if (!role || role !== expected) {
            return throwError(() => new Error('ROLE_MISMATCH'));
          }

          const accessToken = response?.data?.accessToken;
          if (accessToken) {
            this.tokenService.setAccessToken(accessToken);
          }
          const user = response?.data?.user;
          if (user) {
            this.tokenService.setUser(user);
          }

          return of(response);
        }),
      );
  }

  refresh(): Observable<ApiResponse<RefreshData>> {
    return this.http
      .post<ApiResponse<RefreshData>>(`${this.apiBaseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((response) => {
          const accessToken = response?.data?.accessToken;
          if (accessToken) {
            this.tokenService.setAccessToken(accessToken);
          }
        }),
      );
  }

  logout(): Observable<ApiResponse<null>> {
    return this.http
      .post<ApiResponse<null>>(`${this.apiBaseUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        finalize(() => {
          this.tokenService.clearAccessToken();
          this.tokenService.clearUser();
        }),
      );
  }

  getCurrentRole(): string | null {
    return this.tokenService.getRole();
  }

  getCurrentUserId(): string | null {
    return this.tokenService.getUserId();
  }

  getCurrentBoutiqueId(): string | null {
    return this.tokenService.getUser()?.boutiqueId ?? null;
  }
}
