import { z } from 'zod';

/**
 * Ajuste manual de stock. `quantity` es con signo:
 * positivo = entrada, negativo = salida. No puede ser cero.
 */
export const inventoryAdjustmentSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z
    .number()
    .int('La cantidad debe ser entera')
    .refine((q) => q !== 0, 'La cantidad no puede ser cero'),
  notes: z.string().max(500).nullish(),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
