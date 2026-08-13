import { useQuery } from '@tanstack/react-query';
import * as reportsApi from '../api/reports.api';

const KEY = 'reports';

interface Range {
  from?: string;
  to?: string;
  limit?: number;
}

export function useSalesDaily(p: Range, enabled = true) {
  return useQuery({
    queryKey: [KEY, 'daily', p],
    queryFn: () => reportsApi.getSalesDaily(p),
    enabled,
  });
}

export function useTopProducts(p: Range, enabled = true) {
  return useQuery({
    queryKey: [KEY, 'top-products', p],
    queryFn: () => reportsApi.getTopProducts(p),
    enabled,
  });
}

export function useSalesByPayment(p: Range, enabled = true) {
  return useQuery({
    queryKey: [KEY, 'by-payment', p],
    queryFn: () => reportsApi.getSalesByPayment(p),
    enabled,
  });
}

export function useInventorySummary(enabled = true) {
  return useQuery({
    queryKey: [KEY, 'inventory-summary'],
    queryFn: reportsApi.getInventorySummary,
    enabled,
  });
}
