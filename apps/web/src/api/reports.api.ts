import type { ApiSuccess } from '@autopartes-air/shared';
import { api } from './client';

export interface SalesDailyRow {
  date: string;
  count: number;
  totalUsd: number;
  totalBs: number;
}
export interface TopProductRow {
  productId: number;
  code: string;
  name: string;
  quantity: number;
  totalUsd: number;
}
export interface PaymentRow {
  method: string;
  count: number;
  amountUsd: number;
  amountBs: number;
}
export interface InventorySummary {
  activeProducts: number;
  totalUnits: number;
  costUsd: number;
  priceUsd: number;
}

interface Range {
  from?: string;
  to?: string;
  limit?: number;
}

export async function getSalesDaily(p: Range): Promise<SalesDailyRow[]> {
  const { data } = await api.get<ApiSuccess<SalesDailyRow[]>>('/reports/sales/daily', {
    params: p,
  });
  return data.data;
}

export async function getTopProducts(p: Range): Promise<TopProductRow[]> {
  const { data } = await api.get<ApiSuccess<TopProductRow[]>>('/reports/sales/top-products', {
    params: p,
  });
  return data.data;
}

export async function getSalesByPayment(p: Range): Promise<PaymentRow[]> {
  const { data } = await api.get<ApiSuccess<PaymentRow[]>>('/reports/sales/by-payment', {
    params: p,
  });
  return data.data;
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const { data } = await api.get<ApiSuccess<InventorySummary>>('/reports/inventory/summary');
  return data.data;
}
