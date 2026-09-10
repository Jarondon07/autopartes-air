import type {
  AddDebtPaymentInput,
  ApiSuccess,
  DebtStatus,
  DebtsSummary,
  PaymentMethod,
} from '@autopartes-air/shared';
import { api } from './client';
import type { SaleDetailRow } from './sales.api';

export interface DebtRow {
  saleId: number;
  clientId: number | null;
  clientName: string | null;
  userId: number;
  saleDate: string;
  dueDate: string | null;
  totalUsd: string;
  paidUsd: string;
  balanceUsd: string;
  status: DebtStatus;
  daysOverdue: number;
  notes: string | null;
}

export interface DebtPaymentRow {
  id: number;
  saleId: number;
  method: PaymentMethod;
  amountUsd: string;
  amountBs: string;
  paidAt: string;
  exchangeRate: string | null;
  userId: number | null;
  userName: string | null;
  notes: string | null;
}

export interface DebtDetail extends DebtRow {
  payments: DebtPaymentRow[];
  details?: SaleDetailRow[];
}

export interface DebtsPage {
  data: DebtRow[];
  meta: { page: number; limit: number; total: number };
}

export interface DebtFiltersParams {
  page?: number;
  limit?: number;
  clientId?: number;
  status?: DebtStatus;
  overdue?: boolean;
  from?: string;
  to?: string;
}

/** GET /debts — ventas a crédito con su saldo. */
export async function listDebts(params: DebtFiltersParams): Promise<DebtsPage> {
  const { data } = await api.get<ApiSuccess<DebtRow[]>>('/debts', { params });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

/** GET /debts/summary — total por cobrar y vencido. */
export async function getDebtsSummary(clientId?: number): Promise<DebtsSummary> {
  const { data } = await api.get<ApiSuccess<DebtsSummary>>('/debts/summary', {
    params: { clientId },
  });
  return data.data;
}

/** GET /debts/:id — la deuda con sus abonos. */
export async function getDebt(saleId: number): Promise<DebtDetail> {
  const { data } = await api.get<ApiSuccess<DebtDetail>>(`/debts/${saleId}`);
  return data.data;
}

/** POST /debts/:id/payments — registra un abono. */
export async function addDebtPayment(
  saleId: number,
  input: AddDebtPaymentInput,
): Promise<DebtDetail> {
  const { data } = await api.post<ApiSuccess<DebtDetail>>(`/debts/${saleId}/payments`, input);
  return data.data;
}
