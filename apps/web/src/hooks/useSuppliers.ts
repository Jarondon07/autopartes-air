import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { SupplierInput } from '@autopartes-air/shared';
import * as suppliersApi from '../api/suppliers.api';

const KEY = 'suppliers';

export function useSuppliers(params: { page?: number; limit?: number; q?: string }) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => suppliersApi.listSuppliers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) => suppliersApi.createSupplier(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: SupplierInput }) =>
      suppliersApi.updateSupplier(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => suppliersApi.deleteSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
