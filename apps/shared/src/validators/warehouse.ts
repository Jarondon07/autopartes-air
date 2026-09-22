import { z } from 'zod';

export const warehouseSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  isActive: z.boolean().optional(),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
