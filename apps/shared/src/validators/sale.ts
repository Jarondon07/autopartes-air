import { z } from 'zod';
import { PAYMENT_METHODS } from '../constants/enums';
import { moneySchema, paginationSchema } from './common';

export const saleDetailInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  /** Permite ajustar el precio en el POS; si se omite se usa el precio vigente del producto. */
  unitPriceUsd: moneySchema.optional(),
});

export const createSaleSchema = z.object({
  clientId: z.number().int().positive().nullish(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().max(500).nullish(),
  details: z.array(saleDetailInputSchema).min(1, 'La venta necesita al menos un producto'),
});

export const saleFiltersSchema = paginationSchema.extend({
  clientId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(['completada', 'anulada']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleFilters = z.infer<typeof saleFiltersSchema>;
