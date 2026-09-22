import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WarehouseInput } from '@autopartes-air/shared';
import * as warehousesApi from '../api/warehouses.api';

const KEY = 'warehouses';

export function useWarehouses() {
  return useQuery({ queryKey: [KEY], queryFn: warehousesApi.listWarehouses });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WarehouseInput) => warehousesApi.createWarehouse(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: WarehouseInput }) =>
      warehousesApi.updateWarehouse(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => warehousesApi.deleteWarehouse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
