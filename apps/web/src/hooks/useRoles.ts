import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateRoleInput } from '@autopartes-air/shared';
import * as rolesApi from '../api/roles.api';

const KEY = 'roles';
const STALE = 5 * 60 * 1000;

export function useRoles() {
  return useQuery({
    queryKey: [KEY],
    queryFn: rolesApi.listRoles,
    staleTime: STALE,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: rolesApi.listPermissions,
    staleTime: STALE,
  });
}

export function useSetRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: string[] }) =>
      rolesApi.setRolePermissions(id, permissions),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleInput) => rolesApi.createRole(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
