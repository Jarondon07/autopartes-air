import type { ApiSuccess, CreatePurchaseInput } from '@autopartes-air/shared';
import { api } from './client';

export interface PurchaseRow {
  id: number;
  supplierId: number;
  supplierName: string;
  userId: number;
  invoiceNumber: string | null;
  purchaseDate: string;
  exchangeRate: string;
  totalUsd: string;
  totalBs: string;
  notes: string | null;
  createdAt: string;
}

export interface PurchaseDetailRow {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCostUsd: string;
  subtotalUsd: string;
}

export interface PurchaseDetail extends PurchaseRow {
  details: PurchaseDetailRow[];
}

export interface PurchasesPage {
  data: PurchaseRow[];
  meta: { page: number; limit: number; total: number };
}

export async function listPurchases(params: {
  page?: number;
  limit?: number;
  supplierId?: number;
  from?: string;
  to?: string;
}): Promise<PurchasesPage> {
  const { data } = await api.get<ApiSuccess<PurchaseRow[]>>('/purchases', { params });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

export async function getPurchase(id: number): Promise<PurchaseDetail> {
  const { data } = await api.get<ApiSuccess<PurchaseDetail>>(`/purchases/${id}`);
  return data.data;
}

export async function createPurchase(
  input: CreatePurchaseInput,
): Promise<PurchaseDetail> {
  const { data } = await api.post<ApiSuccess<PurchaseDetail>>('/purchases', input);
  return data.data;
}
