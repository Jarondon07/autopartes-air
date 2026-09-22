import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InventoryAdjustmentInput, MovementType } from '@autopartes-air/shared';
import * as inventoryApi from '../api/inventory.api';

const KEY = 'inventory';

export function useMovements(params: {
  page?: number;
  limit?: number;
  productId?: number;
  movementType?: MovementType;
}) {
  return useQuery({
    queryKey: [KEY, 'movements', params],
    queryFn: () => inventoryApi.listMovements(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InventoryAdjustmentInput) =>
      inventoryApi.createAdjustment(input),
    onSuccess: () => {
      // El stock cambió: refrescar movimientos y productos.
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
