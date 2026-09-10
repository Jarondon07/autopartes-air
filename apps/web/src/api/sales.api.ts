import type {
  ApiSuccess,
  CreateSaleInput,
  PaymentMethod,
  SalePayment,
  SaleStatus,
} from '@autopartes-air/shared';
import { api } from './client';

export interface SaleRow {
  id: number;
  clientId: number | null;
  clientName: string | null;
  userId: number;
  saleDate: string;
  exchangeRate: string;
  subtotalUsd: string;
  ivaUsd: string;
  totalUsd: string;
  totalBs: string;
  paymentMethods: PaymentMethod[];
  status: SaleStatus;
  createdAt: string;
}

export interface SaleDetailRow {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPriceUsd: string;
  subtotalUsd: string;
  /** Precio de lista, solo si el renglón se vendió a otro precio. */
  originalPriceUsd: string | null;
  /** Quién autorizó ese precio con su PIN. */
  authorizedByName: string | null;
}

export interface SaleDetail extends SaleRow {
  ivaPct: string;
  voidedAt: string | null;
  notes: string | null;
  details: SaleDetailRow[];
  payments: SalePayment[];
}

export interface SalesPage {
  data: SaleRow[];
  meta: { page: number; limit: number; total: number };
}

export async function listSales(params: {
  page?: number;
  limit?: number;
  clientId?: number;
  status?: SaleStatus;
  from?: string;
  to?: string;
}): Promise<SalesPage> {
  const { data } = await api.get<ApiSuccess<SaleRow[]>>('/sales', { params });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

export interface SalesSummary {
  count: number;
  totalUsd: number;
  totalBs: number;
}

/** GET /sales/summary — conteo + suma USD/Bs agregada en SQL. */
export async function getSalesSummary(params: {
  from?: string;
  to?: string;
  status?: SaleStatus;
}): Promise<SalesSummary> {
  const { data } = await api.get<ApiSuccess<SalesSummary>>('/sales/summary', { params });
  return data.data;
}

export async function getSale(id: number): Promise<SaleDetail> {
  const { data } = await api.get<ApiSuccess<SaleDetail>>(`/sales/${id}`);
  return data.data;
}

export async function createSale(input: CreateSaleInput): Promise<SaleDetail> {
  const { data } = await api.post<ApiSuccess<SaleDetail>>('/sales', input);
  return data.data;
}

export async function voidSale(id: number): Promise<SaleDetail> {
  const { data } = await api.post<ApiSuccess<SaleDetail>>(`/sales/${id}/void`);
  return data.data;
}

export interface PriceAuthorization {
  /** Token de 5 minutos que se adjunta a la venta. */
  token: string;
  authorizedBy: string;
}

/**
 * POST /sales/price-authorization — pide autorización para vender fuera del
 * precio de lista. El supervisor teclea su usuario y PIN; la sesión del cajero
 * no cambia.
 */
export async function requestPriceAuthorization(input: {
  username: string;
  pin: string;
}): Promise<PriceAuthorization> {
  const { data } = await api.post<ApiSuccess<PriceAuthorization>>(
    '/sales/price-authorization',
    input,
  );
  return data.data;
}
