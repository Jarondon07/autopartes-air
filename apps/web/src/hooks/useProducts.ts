import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  CreateProductInput,
  ProductFilters,
  UpdateProductInput,
} from '@autopartes-air/shared';
import * as productsApi from '../api/products.api';

const KEY = 'products';

/** Lista paginada de productos. Mantiene la data previa al cambiar de página. */
export function useProducts(filters: Partial<ProductFilters>) {
  return useQuery({
    queryKey: [KEY, filters],
    queryFn: () => productsApi.listProducts(filters),
    placeholderData: keepPreviousData,
  });
}

/** Detalle de un producto (incluye vehículos compatibles). */
export function useProduct(id: number | null) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => productsApi.getProduct(id as number),
    enabled: id != null,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsApi.createProduct(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateProductInput }) =>
      productsApi.updateProduct(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productsApi.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
