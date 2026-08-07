import type {
  ApiSuccess,
  CreateExchangeRateInput,
  ExchangeRate,
  ExchangeRateSource,
} from '@autopartes-air/shared';
import { api } from './client';

export type CurrentRates = Record<ExchangeRateSource, ExchangeRate | null>;

export interface RatesPage {
  data: ExchangeRate[];
  meta: { page: number; limit: number; total: number };
}

/** GET /exchange-rates/current — última tasa vigente por fuente. */
export async function getCurrentRates(): Promise<CurrentRates> {
  const { data } = await api.get<ApiSuccess<CurrentRates>>('/exchange-rates/current');
  return data.data;
}

/** GET /exchange-rates — historial paginado. */
export async function listRates(params: {
  page?: number;
  limit?: number;
  source?: ExchangeRateSource;
}): Promise<RatesPage> {
  const { data } = await api.get<ApiSuccess<ExchangeRate[]>>('/exchange-rates', {
    params,
  });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

/** POST /exchange-rates — registra una tasa. */
export async function createRate(
  input: CreateExchangeRateInput,
): Promise<ExchangeRate> {
  const { data } = await api.post<ApiSuccess<ExchangeRate>>('/exchange-rates', input);
  return data.data;
}
