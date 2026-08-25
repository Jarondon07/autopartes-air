import { z } from 'zod';
import { PAYMENT_METHODS } from '../constants/enums';
import { DEBT_STATUSES } from '../types';
import { moneySchema, paginationSchema } from './common';

export const debtFiltersSchema = paginationSchema.extend({
  clientId: z.coerce.number().int().positive().optional(),
  status: z.enum(DEBT_STATUSES).optional(),
  /** Solo las deudas cuya fecha de pago ya pasó. */
  overdue: z.coerce.boolean().optional(),
  /** Rango sobre la fecha de la venta. */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * Un abono contra una deuda. El monto es en USD (la deuda es en USD); si el
 * método se cobra en bolívares, el servidor calcula el Bs con la tasa del día
 * y la guarda en la fila.
 */
export const addDebtPaymentSchema = z.object({
  amountUsd: moneySchema.refine((v) => v > 0, 'El abono debe ser mayor a cero'),
  method: z.enum(PAYMENT_METHODS),
  notes: z.string().max(200).nullish(),
});

export type DebtFilters = z.infer<typeof debtFiltersSchema>;
export type AddDebtPaymentInput = z.infer<typeof addDebtPaymentSchema>;
