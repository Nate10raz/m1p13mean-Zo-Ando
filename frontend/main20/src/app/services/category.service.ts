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
  description?: string;
  image?: string;
  icon?: string;
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

export interface CategoryListQuery {
  parentId?: string | null;
  search?: string;
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

export interface CategoryUpdatePayload {
  nom?: string;
  slug?: string;
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
  private readonly apiRootUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCategoryTree(params: CategoryTreeQuery = {}): Observable<ApiResponse<CategoryTreeData>> {
    const queryParams = this.buildParams(params);
    return this.http.get<ApiResponse<CategoryTreeData>>(`${this.apiRootUrl}/categories/tree`, {
      params: queryParams,
    });
  }

  listCategories(params: CategoryListQuery = {}): Observable<ApiResponse<CategoryNode[]>> {
    const queryParams = this.buildParams(params);
    return this.http.get<ApiResponse<CategoryNode[]>>(`${this.apiRootUrl}/categories`, {
      params: queryParams,
    });
  }

  createCategory(payload: CategoryCreatePayload): Observable<ApiResponse<CategoryNode>> {
    return this.http.post<ApiResponse<CategoryNode>>(`${this.apiRootUrl}/categories`, payload);
  }

  updateCategory(
    id: string,
    payload: CategoryUpdatePayload,
  ): Observable<ApiResponse<CategoryNode>> {
    return this.http.patch<ApiResponse<CategoryNode>>(
      `${this.apiRootUrl}/categories/${id}`,
      payload,
    );
  }

  getCategoryById(id: string): Observable<ApiResponse<CategoryNode>> {
    return this.http.get<ApiResponse<CategoryNode>>(`${this.apiRootUrl}/categories/${id}`);
  }

  deleteCategory(id: string, force = true): Observable<ApiResponse<null>> {
    const forceParam = force ? 'true' : 'false';
    return this.http.delete<ApiResponse<null>>(
      `${this.apiRootUrl}/categories/${id}?force=${forceParam}`,
    );
  }

  private buildParams(params: CategoryTreeQuery): HttpParams {
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
