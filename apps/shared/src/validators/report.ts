import { z } from 'zod';

/** Rango de fechas para reportes (opcional) + límite para tops. */
export const reportRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type ReportRange = z.infer<typeof reportRangeSchema>;
