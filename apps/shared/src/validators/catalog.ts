import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).nullish(),
});

export const brandSchema = z.object({
  name: z.string().min(1).max(100),
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
