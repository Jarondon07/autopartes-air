import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  /** Abreviatura para el SKU (ej. Evaporadores → EVA). */
  abbreviation: z.string().max(10).nullish(),
  description: z.string().max(500).nullish(),
  isActive: z.boolean().optional(),
});

export const brandSchema = z.object({
  name: z.string().min(1).max(100),
});

export const carBrandSchema = z.object({
  name: z.string().min(1).max(100),
  /** Abreviatura para el SKU (ej. Volkswagen → VW). */
  abbreviation: z.string().max(10).nullish(),
  logoUrl: z.string().max(300).nullish(),
  isActive: z.boolean().optional(),
});

export const carModelSchema = z.object({
  brandId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
});

export const vehicleSchema = z
  .object({
    make: z.string().min(1).max(80),
    model: z.string().min(1).max(80),
    yearFrom: z.number().int().min(1950).max(2100).nullish(),
    yearTo: z.number().int().min(1950).max(2100).nullish(),
  })
  .refine(
    (v) => v.yearFrom == null || v.yearTo == null || v.yearTo >= v.yearFrom,
    { message: 'yearTo debe ser mayor o igual a yearFrom', path: ['yearTo'] },
  );

export type CategoryInput = z.infer<typeof categorySchema>;
export type BrandInput = z.infer<typeof brandSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type CarBrandInput = z.infer<typeof carBrandSchema>;
export type CarModelInput = z.infer<typeof carModelSchema>;
