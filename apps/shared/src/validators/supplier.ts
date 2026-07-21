import { z } from 'zod';

export const supplierSchema = z.object({
  rif: z
    .string()
    .regex(/^[VJEGP]-?\d{8,9}(-?\d)?$/i, 'RIF inválido (ej: J-12345678-9)'),
  name: z.string().min(2).max(200),
  contactName: z.string().max(120).nullish(),
  phone: z.string().max(20).nullish(),
  email: z.string().email().max(120).nullish(),
  address: z.string().max(300).nullish(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
