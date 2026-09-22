import { z } from 'zod';
import { moneySchema, paginationSchema } from './common';

/** Un modelo de carro compatible con su rango de años propio. */
export const productCarModelSchema = z
  .object({
    carModelId: z.number().int().positive(),
    yearFrom: z.coerce.number().int().min(1950).max(2100).nullish(),
    yearTo: z.coerce.number().int().min(1950).max(2100).nullish(),
  })
  .refine((v) => v.yearFrom == null || v.yearTo == null || v.yearTo >= v.yearFrom, {
    message: 'El año "hasta" debe ser mayor o igual al "desde"',
    path: ['yearTo'],
  });

const productBaseSchema = z.object({
  // El código se genera en el servidor a partir de marca + número de pieza.
  code: z.string().max(50).optional(),
  partNumber: z.string().min(1, 'Ingresa el número de pieza').max(50),
  name: z.string().min(2).max(200),
  shortDescription: z.string().max(255).nullish(),
  description: z.string().max(5000).nullish(),
  /** Categorías del producto (la primera es la principal y define el SKU). */
  categoryIds: z.array(z.number().int().positive()).optional(),
  brandId: z.number().int().positive().nullish(),
  /** Marca del carro para el que sirve (una sola). */
  carBrandId: z.number().int().positive().nullish(),
  /** Modelos del carro a los que sirve, cada uno con su rango de años. */
  carModels: z.array(productCarModelSchema).optional(),
  /**
   * Sirve para cualquier vehículo (gas refrigerante, aceites, limpiadores).
   * Cuando es `true`, marca y modelos del carro dejan de ser obligatorios.
   */
  isUniversal: z.boolean().optional(),
  // El costo se define al registrar la compra (último costo); opcional al crear.
  costUsd: moneySchema.optional(),
  markupPct: z.coerce.number().min(0).max(999.99),
  /**
   * El stock NO se fija a mano al crear el producto: nace en 0 y entra por
   * compras o ajustes, para que cada unidad tenga su movimiento en el
   * historial de inventario.
   */
  minStock: z.number().int().min(0).default(0),
  warehouseId: z.number().int().positive().nullish(),
  /** URLs de imágenes en orden de visualización (la primera es la principal). */
  images: z.array(z.string().max(300)).max(10, 'Máximo 10 imágenes').optional(),
});

/** Al crear, estos campos son obligatorios (además de nombre y número de pieza). */
export const createProductSchema = productBaseSchema.superRefine((v, ctx) => {
  const require = (ok: boolean, path: string, message: string) => {
    if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
  };
  require((v.categoryIds?.length ?? 0) > 0, 'categoryIds', 'Selecciona al menos una categoría');
  require(v.brandId != null, 'brandId', 'Selecciona la marca del repuesto');
  // Un producto universal no lleva marca ni modelos: sirve para todos los carros.
  if (!v.isUniversal) {
    require(v.carBrandId != null, 'carBrandId', 'Selecciona la marca del carro');
    require((v.carModels?.length ?? 0) > 0, 'carModels', 'Agrega al menos un modelo compatible');
  }
});

export const updateProductSchema = productBaseSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const productFiltersSchema = paginationSchema.extend({
  q: z.string().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type ProductCarModelInput = z.infer<typeof productCarModelSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductFilters = z.infer<typeof productFiltersSchema>;
