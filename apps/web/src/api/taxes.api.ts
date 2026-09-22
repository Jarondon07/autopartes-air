import type { ApiSuccess, Tax, TaxInput } from '@autopartes-air/shared';
import { api } from './client';

export async function listTaxes(): Promise<Tax[]> {
  const { data } = await api.get<ApiSuccess<Tax[]>>('/taxes');
  return data.data;
}

export async function createTax(input: TaxInput): Promise<Tax> {
  const { data } = await api.post<ApiSuccess<Tax>>('/taxes', input);
  return data.data;
}

export async function updateTax(id: number, input: TaxInput): Promise<Tax> {
  const { data } = await api.patch<ApiSuccess<Tax>>(`/taxes/${id}`, input);
  return data.data;
}

export async function deleteTax(id: number): Promise<void> {
  await api.delete(`/taxes/${id}`);
}
