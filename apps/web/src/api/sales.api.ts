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
