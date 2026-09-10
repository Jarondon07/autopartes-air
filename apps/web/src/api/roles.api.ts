import type { ApiSuccess, CreateRoleInput, Role } from '@autopartes-air/shared';
import { api } from './client';

export interface RoleWithPermissions extends Role {
  permissions: string[];
}

export interface Permission {
  id: number;
  code: string;
  description: string | null;
}

export async function listRoles(): Promise<RoleWithPermissions[]> {
  const { data } = await api.get<ApiSuccess<RoleWithPermissions[]>>('/roles');
  return data.data;
}

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await api.get<ApiSuccess<Permission[]>>('/roles/permissions');
  return data.data;
}

export async function setRolePermissions(
  id: number,
  permissions: string[],
): Promise<RoleWithPermissions> {
  const { data } = await api.put<ApiSuccess<RoleWithPermissions>>(
    `/roles/${id}/permissions`,
    { permissions },
  );
  return data.data;
}

export async function createRole(input: CreateRoleInput): Promise<RoleWithPermissions> {
  const { data } = await api.post<ApiSuccess<RoleWithPermissions>>('/roles', input);
  return data.data;
}
