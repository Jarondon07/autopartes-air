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

export interface SupplierSpendRow {
  supplierId: number;
  supplierName: string;
  count: number;
  units: number;
  totalUsd: number;
}
export interface PurchasesSummary {
  count: number;
  totalUsd: number;
  totalBs: number;
  bySupplier: SupplierSpendRow[];
}
export interface ProfitDayRow {
  date: string;
  revenueUsd: number;
  costUsd: number;
  profitUsd: number;
}
export interface ProfitSummary {
  revenueUsd: number;
  costUsd: number;
  profitUsd: number;
  marginPct: number;
  lines: number;
  /** Renglones costeados con el costo actual (ventas previas al costo congelado). */
  estimatedLines: number;
  byDay: ProfitDayRow[];
}
export interface ProfitProductRow {
  productId: number;
  code: string;
  name: string;
  quantity: number;
  revenueUsd: number;
  costUsd: number;
  profitUsd: number;
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

export async function getPurchasesSummary(p: Range): Promise<PurchasesSummary> {
  const { data } = await api.get<ApiSuccess<PurchasesSummary>>('/reports/purchases/summary', {
    params: p,
  });
  return data.data;
}

export async function getSalesProfit(p: Range): Promise<ProfitSummary> {
  const { data } = await api.get<ApiSuccess<ProfitSummary>>('/reports/sales/profit', {
    params: p,
  });
  return data.data;
}

export async function getProfitByProduct(p: Range): Promise<ProfitProductRow[]> {
  const { data } = await api.get<ApiSuccess<ProfitProductRow[]>>(
    '/reports/sales/profit-by-product',
    { params: p },
  );
  return data.data;
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const { data } = await api.get<ApiSuccess<InventorySummary>>('/reports/inventory/summary');
  return data.data;
}
