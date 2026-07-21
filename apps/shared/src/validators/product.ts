import { z } from 'zod';
import { moneySchema, paginationSchema } from './common';

export const createProductSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(2).max(200),
  description: z.string().max(1000).nullish(),
  categoryId: z.number().int().positive().nullish(),
  brandId: z.number().int().positive().nullish(),
  costUsd: moneySchema,
  markupPct: z.coerce.number().min(0).max(999.99),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  location: z.string().max(100).nullish(),
  vehicleIds: z.array(z.number().int().positive()).optional(),
});

export const updateProductSchema = createProductSchema
  .omit({ stock: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const productFiltersSchema = paginationSchema.extend({
  q: z.string().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilters = z.infer<typeof productFiltersSchema>;
