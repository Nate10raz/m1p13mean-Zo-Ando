import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './auth.service';

export interface BoutiqueHoraire {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  ouverture: string;
  fermeture: string;
}

export interface BoutiquePlageLivraison {
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  ouverture: string;
  fermeture: string;
  maxLivraison: number;
}

export interface BoutiqueFermetureExceptionnelle {
  debut: string | Date;
  fin: string | Date;
  motif?: string;
}

export interface Boutique {
  _id: string;
  userId: string;
  nom: string;
  description?: string;
  logo?: string;
  banner?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  horaires: BoutiqueHoraire[];
  clickCollectActif: boolean;
  plage_livraison_boutique: BoutiquePlageLivraison[];
  accepteLivraisonJourJ: boolean;
  status: 'en_attente' | 'active' | 'suspendue' | 'rejetee';
  statusLivreur?: string;
  noteMoyenne: number;
  nombreAvis: number;
  boxId?: string;
  boxIds?: any[];
  motifSuspension?: string;
  dateValidation?: string;
  fermeureBoutique?: BoutiqueFermetureExceptionnelle[];
  livraisonStatus?: boolean;
  fraisLivraison?: number;
  fraisLivraisonData?: {
    montant: number;
    type: 'fixe' | 'pourcentage';
  };
  isActive?: boolean;
  isOpen?: boolean;
  manualSwitchOpen?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoutiqueInventoryItem {
  _id: string;
  titre: string;
  slug?: string;
  sku?: string;
  images?: Array<{ url?: string; isMain?: boolean }> | string[];
  prixBaseActuel?: number;
  estActif?: boolean;
  stockTheorique?: number;
  seuilAlerte?: number | null;
  isLowStock?: boolean;
  lastMovementAt?: string | Date | null;
}

export interface BoutiqueInventoryResponse {
  items: BoutiqueInventoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BoutiqueInventoryQuery {
  page?: number;
  limit?: number;
  search?: string;
  lowStock?: boolean;
  categorieId?: string;
  estActif?: boolean;
}

export interface BoutiqueStockMovementPayload {
  produitId: string;
  type: 'ajout' | 'retrait' | 'ajustement';
  quantite?: number;
  stockPhysique?: number;
  raison?: string;
  reference?: string;
}

export interface BoutiqueStockMovementItem {
  _id: string;
  type: 'ajout' | 'retrait' | 'commande' | 'ajustement' | 'retour' | 'defectueux';
  quantite: number;
  stockAvant: number;
  stockApres: number;
  reference?: string;
  raison?: string;
  commandeId?: string;
  userId?: string;
  variationId?: string;
  createdAt: string | Date;
}

export interface BoutiqueStockMovementListResponse {
  produit: {
    _id: string;
    titre?: string;
    sku?: string;
  };
  items: BoutiqueStockMovementItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BoutiqueStockMovementQuery {
  produitId: string;
  page?: number;
  limit?: number;
  type?: BoutiqueStockMovementItem['type'];
  startDate?: string;
  endDate?: string;
}

export interface BoutiqueStockMovementGlobalExportQuery {
  type?: BoutiqueStockMovementItem['type'];
  startDate?: string;
  endDate?: string;
  limit?: number;
  search?: string;
  categorieId?: string;
  estActif?: boolean;
}

export interface BoutiqueStockMovementResponse {
  produitId: string;
  stockAvant: number;
  stockApres: number;
  mouvement: unknown | null;
}

export interface BoutiqueStockBulkAdjustItem {
  produitId: string;
  stockPhysique: number;
  raison?: string;
  reference?: string;
}

export interface BoutiqueStockBulkAdjustPayload {
  items: BoutiqueStockBulkAdjustItem[];
}

export interface BoutiqueStockBulkAdjustResult {
  produitId: string;
  stockAvant: number | null;
  stockApres: number | null;
  mouvementId: string | null;
  status: 'updated' | 'skipped' | 'failed';
  error?: string | null;
}

export interface BoutiqueStockBulkAdjustResponse {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  results: BoutiqueStockBulkAdjustResult[];
}

export interface BoutiqueStockImportItem {
  produitId?: string;
  produit?: string;
  sku?: string;
  stockPhysique: number;
  raison?: string;
  reference?: string;
}

export interface BoutiqueStockImportPayload {
  items: BoutiqueStockImportItem[];
}

export interface BoutiqueStockImportResponse {
  processed: number;
  updated: number;
  results: Array<{
    produitId: string;
    stockAvant: number;
    stockApres: number;
    mouvementId: string | null;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class BoutiqueService {
  private readonly apiRootUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMyBoutique(): Observable<ApiResponse<Boutique>> {
    return this.http.get<ApiResponse<Boutique>>(`${this.apiRootUrl}/boutiques/me`);
  }

  updateMyBoutique(data: Partial<Boutique>): Observable<ApiResponse<Boutique>> {
    return this.http.patch<ApiResponse<Boutique>>(`${this.apiRootUrl}/boutiques/me`, data);
  }

  getBoutiqueById(id: string): Observable<ApiResponse<Boutique>> {
    return this.http.get<ApiResponse<Boutique>>(`${this.apiRootUrl}/boutiques/${id}`);
  }

  updateBoutique(id: string, data: Partial<Boutique>): Observable<ApiResponse<Boutique>> {
    return this.http.put<ApiResponse<Boutique>>(`${this.apiRootUrl}/boutiques/${id}`, data);
  }

  getMarketplaceFee(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.apiRootUrl}/boutiques/frais-livraison/supermarche`,
    );
  }

  getSupermarketClosures(): Observable<ApiResponse<BoutiqueFermetureExceptionnelle[]>> {
    return this.http.get<ApiResponse<BoutiqueFermetureExceptionnelle[]>>(
      `${this.apiRootUrl}/boutiques/closures/supermarket`,
    );
  }

  getBoutiqueInventory(
    params: BoutiqueInventoryQuery = {},
  ): Observable<ApiResponse<BoutiqueInventoryResponse>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.lowStock !== undefined)
      httpParams = httpParams.set('lowStock', String(params.lowStock));
    if (params.categorieId) httpParams = httpParams.set('categorieId', params.categorieId);
    if (params.estActif !== undefined)
      httpParams = httpParams.set('estActif', String(params.estActif));

    return this.http.get<ApiResponse<BoutiqueInventoryResponse>>(
      `${this.apiRootUrl}/boutiques/me/inventaire`,
      { params: httpParams },
    );
  }

  getStockMovements(
    params: BoutiqueStockMovementQuery,
  ): Observable<ApiResponse<BoutiqueStockMovementListResponse>> {
    let httpParams = new HttpParams().set('produitId', params.produitId);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get<ApiResponse<BoutiqueStockMovementListResponse>>(
      `${this.apiRootUrl}/boutiques/me/inventaire/mouvements`,
      { params: httpParams },
    );
  }

  exportStockMovementsCsv(params: BoutiqueStockMovementQuery): Observable<Blob> {
    let httpParams = new HttpParams().set('produitId', params.produitId).set('format', 'csv');
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);

    return this.http.get(`${this.apiRootUrl}/boutiques/me/inventaire/mouvements`, {
      params: httpParams,
      responseType: 'blob',
    });
  }

  exportStockMovementsGlobalCsv(
    params: BoutiqueStockMovementGlobalExportQuery = {},
  ): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params.limit) httpParams = httpParams.set('limit', params.limit);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.categorieId) httpParams = httpParams.set('categorieId', params.categorieId);
    if (params.estActif !== undefined)
      httpParams = httpParams.set('estActif', String(params.estActif));

    return this.http.get(`${this.apiRootUrl}/boutiques/me/inventaire/mouvements/export`, {
      params: httpParams,
      responseType: 'blob',
    });
  }

  createStockMovement(
    payload: BoutiqueStockMovementPayload,
  ): Observable<ApiResponse<BoutiqueStockMovementResponse>> {
    return this.http.post<ApiResponse<BoutiqueStockMovementResponse>>(
      `${this.apiRootUrl}/boutiques/me/inventaire/mouvements`,
      payload,
    );
  }

  bulkStockAdjustments(
    payload: BoutiqueStockBulkAdjustPayload,
  ): Observable<ApiResponse<BoutiqueStockBulkAdjustResponse>> {
    return this.http.post<ApiResponse<BoutiqueStockBulkAdjustResponse>>(
      `${this.apiRootUrl}/boutiques/me/inventaire/mouvements/bulk`,
      payload,
    );
  }

  importStockCsv(
    payload: BoutiqueStockImportPayload,
  ): Observable<ApiResponse<BoutiqueStockImportResponse>> {
    return this.http.post<ApiResponse<BoutiqueStockImportResponse>>(
      `${this.apiRootUrl}/boutiques/me/inventaire/import`,
      payload,
    );
  }
}
