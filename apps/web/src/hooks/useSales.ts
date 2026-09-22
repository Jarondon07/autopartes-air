import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { CreateSaleInput, SaleStatus } from '@autopartes-air/shared';
import * as salesApi from '../api/sales.api';

const KEY = 'sales';

export function useSales(params: {
  page?: number;
  limit?: number;
  clientId?: number;
  status?: SaleStatus;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => salesApi.listSales(params),
    placeholderData: keepPreviousData,
  });
}

export function useSalesSummary(params: { from?: string; to?: string; status?: SaleStatus }) {
  return useQuery({
    queryKey: [KEY, 'summary', params],
    queryFn: () => salesApi.getSalesSummary(params),
  });
}

export function useSale(id: number | null) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => salesApi.getSale(id as number),
    enabled: id != null,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => salesApi.createSale(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useVoidSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => salesApi.voidSale(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
