import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export type BoutiqueDashboardGranularity = 'day' | 'week' | 'month';

export interface BoutiqueDashboardVentesQuery {
  startDate?: string;
  endDate?: string;
  topN?: number;
  granularity?: BoutiqueDashboardGranularity;
}

export interface BoutiqueDashboardTrendPoint {
  date: string;
  revenue: number;
  revenueFormatted: string;
  ordersCount: number;
}

export interface BoutiqueDashboardTopProduct {
  produitId: string | null;
  nomProduit: string | null;
  quantite: number;
  revenue: number;
  revenueFormatted: string;
}

export interface BoutiqueDashboardTopCategory {
  categorieId: string | null;
  categorieNom: string | null;
  quantite: number;
  revenue: number;
  revenueFormatted: string;
}

export interface BoutiqueDashboardVentes {
  period: {
    start: string;
    end: string;
  };
  currency: string;
  topN: number;
  boutique: {
    id: string;
  };
  sales: {
    revenue: number;
    ordersCount: number;
    ordersValidCount: number;
    aov: number;
    cancelRate: number;
    statusCounts: {
      en_preparation: number;
      peut_etre_collecte: number;
      annulee: number;
      en_attente_validation: number;
      non_acceptee: number;
    };
    trend: BoutiqueDashboardTrendPoint[];
    topProducts: BoutiqueDashboardTopProduct[];
    topCategories: BoutiqueDashboardTopCategory[];
  };
  customers: {
    activeCount: number;
    avisCount: number;
    noteMoyenne: number;
  };
  stock: {
    lowStockCount: number;
    alertsCount: number;
  };
  carts: {
    total: number;
    byStatus: {
      active: number;
      abandoned: number;
      converted: number;
    };
    conversionRate: number;
  };
  rent: {
    payments: {
      counts: {
        valide: number;
        en_attente: number;
        rejete: number;
      };
      amounts: {
        valide: number;
        en_attente: number;
        rejete: number;
      };
    };
    arrears: {
      asOf: string;
      amount: number;
      count: number;
    };
    nextDue: {
      dueDate: string;
      amount: number;
      reference: string | null;
    } | null;
  };
  display: {
    currency: string;
    revenue: string;
    aov: string;
    cancelRate: string;
    conversionRate: string;
    arrearsAmount: string;
    rentPaid: string;
    rentPending: string;
    noteMoyenne: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class BoutiqueDashboardService {
  private readonly apiRootUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboardVentes(
    params: BoutiqueDashboardVentesQuery = {},
  ): Observable<ApiResponse<BoutiqueDashboardVentes>> {
    return this.http.get<ApiResponse<BoutiqueDashboardVentes>>(
      `${this.apiRootUrl}/boutiques/dashboard/ventes`,
      {
        params: this.buildParams(params),
      },
    );
  }

  private buildParams(params: BoutiqueDashboardVentesQuery): HttpParams {
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
