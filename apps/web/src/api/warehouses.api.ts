import type { ApiSuccess, Warehouse, WarehouseInput } from '@autopartes-air/shared';
import { api } from './client';

export async function listWarehouses(): Promise<Warehouse[]> {
  const { data } = await api.get<ApiSuccess<Warehouse[]>>('/warehouses');
  return data.data;
}

export async function createWarehouse(input: WarehouseInput): Promise<Warehouse> {
  const { data } = await api.post<ApiSuccess<Warehouse>>('/warehouses', input);
  return data.data;
}

export async function updateWarehouse(id: number, input: WarehouseInput): Promise<Warehouse> {
  const { data } = await api.patch<ApiSuccess<Warehouse>>(`/warehouses/${id}`, input);
  return data.data;
}

export async function deleteWarehouse(id: number): Promise<void> {
  await api.delete(`/warehouses/${id}`);
}
