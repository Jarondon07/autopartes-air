import type { ApiSuccess, Client, ClientInput } from '@autopartes-air/shared';
import { api } from './client';

export interface ClientsPage {
  data: Client[];
  meta: { page: number; limit: number; total: number };
}

export async function listClients(params: {
  page?: number;
  limit?: number;
  q?: string;
}): Promise<ClientsPage> {
  const { data } = await api.get<ApiSuccess<Client[]>>('/clients', { params });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data } = await api.post<ApiSuccess<Client>>('/clients', input);
  return data.data;
}

export async function updateClient(id: number, input: ClientInput): Promise<Client> {
  const { data } = await api.patch<ApiSuccess<Client>>(`/clients/${id}`, input);
  return data.data;
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/clients/${id}`);
}
