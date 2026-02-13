import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export interface CategoryNode {
  _id: string;
  nom: string;
  slug: string;
  parentId: string | null;
  chemin: string[];
  niveau: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  children?: CategoryNode[];
  isLeaf?: boolean;
}

export type CategoryTreeData = CategoryNode[] | CategoryNode;

export interface CategoryTreeQuery {
  rootId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CategoryCreatePayload {
  nom: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  isActive?: boolean;
  parentId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly apiRootUrl = environment.apiBaseUrl.replace(/\/auth\/?$/, '');

  constructor(private http: HttpClient) {}

  getCategoryTree(params: CategoryTreeQuery = {}): Observable<ApiResponse<CategoryTreeData>> {
    const queryParams = this.buildParams(params);
    return this.http.get<ApiResponse<CategoryTreeData>>(`${this.apiRootUrl}/categories/tree`, {
      params: queryParams,
    });
  }

  createCategory(
    payload: CategoryCreatePayload
  ): Observable<ApiResponse<CategoryNode>> {
    return this.http.post<ApiResponse<CategoryNode>>(`${this.apiRootUrl}/categories`, payload);
  }

  private buildParams(params: CategoryTreeQuery): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (!value) {
        return;
      }
      httpParams = httpParams.set(key, String(value));
    });

    return httpParams;
  }
}
