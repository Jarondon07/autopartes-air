import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaxInput } from '@autopartes-air/shared';
import * as taxesApi from '../api/taxes.api';

const KEY = 'taxes';

export function useTaxes() {
  return useQuery({ queryKey: [KEY], queryFn: taxesApi.listTaxes });
}

/** Suma de los porcentajes de impuestos activos (IVA total aplicable). */
export function useAppliedTaxRate(): number {
  const taxes = useTaxes();
  return (taxes.data ?? [])
    .filter((t) => t.isActive)
    .reduce((sum, t) => sum + Number(t.rate), 0);
}

export function useCreateTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaxInput) => taxesApi.createTax(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaxInput }) =>
      taxesApi.updateTax(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => taxesApi.deleteTax(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
