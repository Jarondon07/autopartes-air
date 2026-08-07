import { z } from 'zod';
import { moneySchema, paginationSchema } from './common';

const productBaseSchema = z.object({
  // El código se genera en el servidor a partir de marca + número de pieza.
  code: z.string().max(50).optional(),
  partNumber: z.string().min(1, 'Ingresa el número de pieza').max(50),
  name: z.string().min(2).max(200),
  shortDescription: z.string().max(255).nullish(),
  description: z.string().max(5000).nullish(),
  categoryId: z.number().int().positive().nullish(),
  brandId: z.number().int().positive().nullish(),
  /** Marca del carro para el que sirve (una sola). */
  carBrandId: z.number().int().positive().nullish(),
  /** Modelos del carro a los que sirve. */
  carModelIds: z.array(z.number().int().positive()).optional(),
  // El costo se define al registrar la compra (último costo); opcional al crear.
  costUsd: moneySchema.optional(),
  markupPct: z.coerce.number().min(0).max(999.99),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  location: z.string().max(100).nullish(),
  /** Años de compatibilidad (rango). */
  yearFrom: z.coerce.number().int().min(1950).max(2100).nullish(),
  yearTo: z.coerce.number().int().min(1950).max(2100).nullish(),
});

const yearsValid = (v: { yearFrom?: number | null; yearTo?: number | null }) =>
  v.yearFrom == null || v.yearTo == null || v.yearTo >= v.yearFrom;
const yearsError = {
  message: 'El año "hasta" debe ser mayor o igual al "desde"',
  path: ['yearTo'] as (string | number)[],
};

export const createProductSchema = productBaseSchema.refine(yearsValid, yearsError);

export const updateProductSchema = productBaseSchema
  .omit({ stock: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine(yearsValid, yearsError);

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
