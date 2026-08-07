import type {
  ApiSuccess,
  CreateUserInput,
  UpdateUserInput,
  User,
} from '@autopartes-air/shared';
import { api } from './client';

export interface UsersPage {
  data: User[];
  meta: { page: number; limit: number; total: number };
}

export async function listUsers(params: {
  page?: number;
  limit?: number;
  q?: string;
}): Promise<UsersPage> {
  const { data } = await api.get<ApiSuccess<User[]>>('/users', { params });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await api.post<ApiSuccess<User>>('/users', input);
  return data.data;
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
  const { data } = await api.patch<ApiSuccess<User>>(`/users/${id}`, input);
  return data.data;
}

export async function resetPassword(id: number, password: string): Promise<void> {
  await api.post(`/users/${id}/reset-password`, { password });
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
