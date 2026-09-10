import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ClientInput } from '@autopartes-air/shared';
import * as clientsApi from '../api/clients.api';

const KEY = 'clients';

export function useClients(params: { page?: number; limit?: number; q?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => clientsApi.listClients(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientInput) => clientsApi.createClient(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ClientInput }) =>
      clientsApi.updateClient(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => clientsApi.deleteClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
