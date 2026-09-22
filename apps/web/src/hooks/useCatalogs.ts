import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryInput } from '@autopartes-air/shared';
import * as catalogsApi from '../api/catalogs.api';

/** Catálogos auxiliares: cambian poco, se cachean 5 minutos. */
const STALE = 5 * 60 * 1000;

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: catalogsApi.listCategories,
    staleTime: STALE,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => catalogsApi.createCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CategoryInput }) =>
      catalogsApi.updateCategory(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => catalogsApi.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: catalogsApi.listBrands,
    staleTime: STALE,
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: catalogsApi.listVehicles,
    staleTime: STALE,
  });
}
