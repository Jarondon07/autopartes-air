import { z } from 'zod';
import { moneySchema, paginationSchema } from './common';

export const purchaseDetailInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitCostUsd: moneySchema,
});

export const createPurchaseSchema = z.object({
  supplierId: z.number().int().positive(),
  invoiceNumber: z.string().max(50).nullish(),
  purchaseDate: z.string().datetime().optional(),
  notes: z.string().max(500).nullish(),
  details: z.array(purchaseDetailInputSchema).min(1, 'La compra necesita al menos un producto'),
});

export const purchaseFiltersSchema = paginationSchema.extend({
  supplierId: z.coerce.number().int().positive().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type PurchaseFilters = z.infer<typeof purchaseFiltersSchema>;
