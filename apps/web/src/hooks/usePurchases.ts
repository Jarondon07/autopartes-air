import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { CreatePurchaseInput } from '@autopartes-air/shared';
import * as purchasesApi from '../api/purchases.api';

const KEY = 'purchases';

export function usePurchases(params: {
  page?: number;
  limit?: number;
  supplierId?: number;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => purchasesApi.listPurchases(params),
    placeholderData: keepPreviousData,
  });
}

export function usePurchase(id: number | null) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => purchasesApi.getPurchase(id as number),
    enabled: id != null,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => purchasesApi.createPurchase(input),
    onSuccess: () => {
      // La compra cambia stock, costo de productos y movimientos.
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
