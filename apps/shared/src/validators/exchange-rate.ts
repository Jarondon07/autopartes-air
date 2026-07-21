import { z } from 'zod';
import { EXCHANGE_RATE_SOURCES } from '../constants/enums';
import { rateSchema } from './common';

export const createExchangeRateSchema = z.object({
  rateDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha en formato YYYY-MM-DD'),
  source: z.enum(EXCHANGE_RATE_SOURCES),
  rateBsPerUsd: rateSchema,
});

export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>;
