import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Monto monetario: hasta 2 decimales, no negativo. */
export const moneySchema = z.coerce
  .number()
  .nonnegative()
  .multipleOf(0.01, 'Máximo 2 decimales');

/** Tasa de cambio: hasta 2 decimales, positiva. */
export const rateSchema = z.coerce
  .number()
  .positive()
  .multipleOf(0.01, 'Máximo 2 decimales');
