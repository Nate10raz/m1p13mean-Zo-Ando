import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  route?: string;
  date?: string;
}

export interface Publication {
  _id: string;
  boutiqueId?: {
    _id: string;
    nom: string;
    description?: string;
    logo?: string;
    // Legacy or other fields
    prenom?: string;
    avatar?: string;
    nomBoutique?: string;
  };
  adminId?: {
    _id: string;
    nom: string;
    prenom: string;
    avatar: string;
  };
  roleAuteur: 'boutique' | 'admin';
  contenu: string;
  medias: string[];
  likes: string[];
  likesCount: number;
  statut: 'publie' | 'brouillon' | 'archive' | 'planifie';
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  // UI helper
  isLiked?: boolean;
}

export interface Commentaire {
  _id: string;
  publicationId: string;
  userId: {
    _id: string;
    nom: string;
    prenom: string;
    avatar: string;
  };
  contenu: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class PublicationService {
  private readonly apiUrl = `${environment.apiUrl}/publications`;

  constructor(private http: HttpClient) {}

  getFeed(page: number = 1, limit: number = 10, search: string = ''): Observable<Publication[]> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http
      .get<ApiResponse<Publication[]>>(this.apiUrl, { params })
      .pipe(map((res) => res.data));
  }

  create(payload: {
    contenu: string;
    medias?: string[];
    scheduledAt?: string | null;
    expiresAt?: string | null;
  }): Observable<Publication> {
    return this.http
      .post<ApiResponse<Publication>>(this.apiUrl, payload)
      .pipe(map((res) => res.data));
  }

  markSeen(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/seen`, {});
  }

  toggleLike(id: string): Observable<Publication> {
    return this.http
      .post<ApiResponse<Publication>>(`${this.apiUrl}/${id}/like`, {})
      .pipe(map((res) => res.data));
  }

  addComment(id: string, contenu: string): Observable<Commentaire> {
    return this.http
      .post<ApiResponse<Commentaire>>(`${this.apiUrl}/${id}/comments`, { contenu })
      .pipe(map((res) => res.data));
  }

  getComments(id: string, page: number = 1): Observable<Commentaire[]> {
    let params = new HttpParams().set('page', page.toString());
    return this.http
      .get<ApiResponse<Commentaire[]>>(`${this.apiUrl}/${id}/comments`, { params })
      .pipe(map((res) => res.data));
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
