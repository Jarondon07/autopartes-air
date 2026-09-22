import { z } from 'zod';

export const taxSchema = z.object({
  name: z.string().min(2).max(60),
  /** Porcentaje del impuesto (ej. 16 para IVA 16%). */
  rate: z.coerce.number().min(0).max(100),
  isActive: z.boolean().optional(),
});

export type TaxInput = z.infer<typeof taxSchema>;
