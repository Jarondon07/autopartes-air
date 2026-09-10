import axios from 'axios';
import type { ApiSuccess } from '@autopartes-air/shared';

/**
 * Cliente del catálogo público.
 *
 * Va aparte de `api/client.ts` a propósito: aquel adjunta el access token y,
 * ante un 401, intenta un refresh y limpia la sesión. En una pantalla que se
 * ve sin haber iniciado sesión eso no tiene sentido y podría cerrarle la
 * sesión a quien sí la tenga abierta en otra pestaña.
 */
const publicApi = axios.create({ baseURL: '/api/v1/public' });

export interface CatalogItem {
  id: number;
  code: string;
  name: string;
  partNumber: string;
  categoryName: string | null;
  brandName: string | null;
  carBrandName: string | null;
  carModels: string[];
  isUniversal: boolean;
  priceUsd: string | null;
  imageUrl: string | null;
  available: boolean;
}

export interface CatalogPage {
  data: CatalogItem[];
  meta: { page: number; limit: number; total: number };
}

export interface CatalogFilters {
  q?: string;
  categoryId?: number;
  carBrandId?: number;
  page?: number;
  limit?: number;
}

export async function listCatalog(params: CatalogFilters): Promise<CatalogPage> {
  const { data } = await publicApi.get<ApiSuccess<CatalogItem[]>>('/catalog', { params });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 24, total: data.data.length },
  };
}

export interface CatalogFilterOptions {
  categories: { id: number; name: string }[];
  carBrands: { id: number; name: string }[];
}

export async function getCatalogFilters(): Promise<CatalogFilterOptions> {
  const { data } = await publicApi.get<ApiSuccess<CatalogFilterOptions>>('/catalog/filters');
  return data.data;
}

export interface CatalogRates {
  usdt: number | null;
  bcv: number | null;
  updatedAt: string | null;
}

export async function getCatalogRates(): Promise<CatalogRates> {
  const { data } = await publicApi.get<ApiSuccess<CatalogRates>>('/catalog/rates');
  return data.data;
}
