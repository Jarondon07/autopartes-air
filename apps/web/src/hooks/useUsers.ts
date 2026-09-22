import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { CreateUserInput, UpdateUserInput } from '@autopartes-air/shared';
import * as usersApi from '../api/users.api';

const KEY = 'users';

export function useUsers(params: { page?: number; limit?: number; q?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => usersApi.listUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.createUser(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateUserInput }) =>
      usersApi.updateUser(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      usersApi.resetPassword(id, password),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
