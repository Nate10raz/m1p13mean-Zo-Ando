import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export interface ProductCreateResponse {
  _id: string;
  boutiqueId: string;
  boutique?: {
    _id?: string;
    nom?: string;
  };
  titre: string;
  slug?: string;
  description?: string;
  descriptionCourte?: string;
  categorieId: string;
  sousCategoriesIds?: string[];
  tags?: string[];
  sku?: string;
  attributs?: Array<{
    nom: string;
    valeurs: string[];
  }>;
  hasVariations?: boolean;
  prixBaseActuel: number;
  stock?: {
    quantite: number;
    seuilAlerte: number;
  };
  noteMoyenne?: number;
  nombreAvis?: number;
  publishedAt?: string;
  estActif?: boolean;
  images?: Array<{
    url: string;
    ordre: number;
    isMain: boolean;
    publicId: string;
    _id: string;
  }>;
  updatedAt?: string;
  createdAt?: string;
}

export interface ProductListResponse {
  items: ProductCreateResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LandingProductsResponse {
  limit: number;
  bestSeller: ProductCreateResponse | null;
  newest: ProductCreateResponse | null;
  others: ProductCreateResponse[];
  total: number;
}

export interface ProductListQuery {
  page?: number;
  limit?: number;
  search?: string;
  estActif?: boolean;
  categorieId?: string;
  minPrix?: number;
  maxPrix?: number;
  sort?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiRootUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createProduct(payload: FormData): Observable<ApiResponse<ProductCreateResponse>> {
    return this.http.post<ApiResponse<ProductCreateResponse>>(
      `${this.apiRootUrl}/produits`,
      payload,
    );
  }

  getProductById(id: string): Observable<ApiResponse<ProductCreateResponse>> {
    return this.http.get<ApiResponse<ProductCreateResponse>>(`${this.apiRootUrl}/produits/${id}`);
  }

  updateProduct(id: string, payload: FormData): Observable<ApiResponse<ProductCreateResponse>> {
    return this.http.patch<ApiResponse<ProductCreateResponse>>(
      `${this.apiRootUrl}/produits/${id}`,
      payload,
    );
  }

  deleteProductImage(
    productId: string,
    imageId: string,
  ): Observable<ApiResponse<ProductCreateResponse>> {
    return this.http.delete<ApiResponse<ProductCreateResponse>>(
      `${this.apiRootUrl}/produits/${productId}/images/${imageId}`,
    );
  }

  setProductMainImage(
    productId: string,
    imageId: string,
  ): Observable<ApiResponse<ProductCreateResponse>> {
    return this.http.patch<ApiResponse<ProductCreateResponse>>(
      `${this.apiRootUrl}/produits/${productId}/images/${imageId}/main`,
      {},
    );
  }

  updateStockAlert(
    productId: string,
    seuilAlerte: number,
  ): Observable<ApiResponse<ProductCreateResponse>> {
    return this.http.patch<ApiResponse<ProductCreateResponse>>(
      `${this.apiRootUrl}/produits/${productId}/stock-alert`,
      { seuilAlerte },
    );
  }

  updateStockAlertBulk(
    ids: string[],
    seuilAlerte: number,
  ): Observable<ApiResponse<{ matchedCount: number; modifiedCount: number }>> {
    return this.http.patch<ApiResponse<{ matchedCount: number; modifiedCount: number }>>(
      `${this.apiRootUrl}/produits/stock-alert/bulk`,
      { ids, seuilAlerte },
    );
  }

  updateStockAlertBulkByCategory(
    categorieId: string,
    seuilAlerte: number,
  ): Observable<ApiResponse<{ matchedCount: number; modifiedCount: number }>> {
    return this.http.patch<ApiResponse<{ matchedCount: number; modifiedCount: number }>>(
      `${this.apiRootUrl}/produits/stock-alert/bulk`,
      { categorieId, seuilAlerte },
    );
  }

  listProducts(params: ProductListQuery = {}): Observable<ApiResponse<ProductListResponse>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.search) queryParams.set('search', params.search);
    if (params.estActif !== undefined) queryParams.set('estActif', String(params.estActif));
    if (params.categorieId) queryParams.set('categorieId', params.categorieId);
    if (params.minPrix !== undefined) queryParams.set('minPrix', String(params.minPrix));
    if (params.maxPrix !== undefined) queryParams.set('maxPrix', String(params.maxPrix));
    if (params.sort) queryParams.set('sort', params.sort);

    const suffix = queryParams.toString();
    const url = suffix ? `${this.apiRootUrl}/produits?${suffix}` : `${this.apiRootUrl}/produits`;
    return this.http.get<ApiResponse<ProductListResponse>>(url);
  }

  getLandingProducts(limit = 6): Observable<ApiResponse<LandingProductsResponse>> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.set('limit', String(limit));

    const suffix = queryParams.toString();
    const url = suffix
      ? `${this.apiRootUrl}/produits/landing?${suffix}`
      : `${this.apiRootUrl}/produits/landing`;
    return this.http.get<ApiResponse<LandingProductsResponse>>(url);
  }
}
