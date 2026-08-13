import { z } from 'zod';
import { PAYMENT_METHODS } from '../constants/enums';
import { moneySchema, paginationSchema } from './common';

export const saleDetailInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  /** Permite ajustar el precio en el POS; si se omite se usa el precio vigente del producto. */
  unitPriceUsd: moneySchema.optional(),
});

/** Un pago del desglose: método + valor cubierto en USD + Bs cobrado. */
export const salePaymentInputSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amountUsd: moneySchema,
  amountBs: moneySchema.default(0),
});

export const createSaleSchema = z.object({
  clientId: z.number().int().positive().nullish(),
  payments: z
    .array(salePaymentInputSchema)
    .min(1, 'Selecciona al menos un método de pago'),
  notes: z.string().max(500).nullish(),
  /** Si aplica el IVA al total. Por defecto NO se aplica. */
  applyIva: z.boolean().optional(),
  details: z.array(saleDetailInputSchema).min(1, 'La venta necesita al menos un producto'),
});

export const saleFiltersSchema = paginationSchema.extend({
  clientId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(['completada', 'anulada']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Resumen agregado de ventas (para dashboard/reportes): suma en SQL, sin filas. */
export const salesSummaryQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(['completada', 'anulada']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type SalesSummaryQuery = z.infer<typeof salesSummaryQuerySchema>;

export type SalePaymentInput = z.infer<typeof salePaymentInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleFilters = z.infer<typeof saleFiltersSchema>;
