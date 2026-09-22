import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddDebtPaymentInput } from '@autopartes-air/shared';
import * as debtsApi from '../api/debts.api';
import type { DebtFiltersParams } from '../api/debts.api';

const KEY = 'debts';

export function useDebts(params: DebtFiltersParams, enabled = true) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => debtsApi.listDebts(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Totales por cobrar. `enabled` para no llamar sin permiso (evita 403 en el dashboard). */
export function useDebtsSummary(enabled = true, clientId?: number) {
  return useQuery({
    queryKey: [KEY, 'summary', clientId ?? null],
    queryFn: () => debtsApi.getDebtsSummary(clientId),
    enabled,
  });
}

export function useDebt(saleId: number | null) {
  return useQuery({
    queryKey: [KEY, 'detail', saleId],
    queryFn: () => debtsApi.getDebt(saleId as number),
    enabled: saleId != null,
  });
}

export function useAddDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, input }: { saleId: number; input: AddDebtPaymentInput }) =>
      debtsApi.addDebtPayment(saleId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      // El abono también cambia el historial de la venta.
      qc.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}
