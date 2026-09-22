import type { ApiSuccess, Supplier, SupplierInput } from '@autopartes-air/shared';
import { api } from './client';

export interface SuppliersPage {
  data: Supplier[];
  meta: { page: number; limit: number; total: number };
}

export async function listSuppliers(params: {
  page?: number;
  limit?: number;
  q?: string;
}): Promise<SuppliersPage> {
  const { data } = await api.get<ApiSuccess<Supplier[]>>('/suppliers', { params });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data } = await api.post<ApiSuccess<Supplier>>('/suppliers', input);
  return data.data;
}

export async function updateSupplier(
  id: number,
  input: SupplierInput,
): Promise<Supplier> {
  const { data } = await api.patch<ApiSuccess<Supplier>>(`/suppliers/${id}`, input);
  return data.data;
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/suppliers/${id}`);
}
