import { useQuery } from '@tanstack/react-query';
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
