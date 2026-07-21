import { Router } from 'express';
import { z } from 'zod';
import {
  EXCHANGE_RATE_SOURCES,
  PERMISSIONS,
  createExchangeRateSchema,
  paginationSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import * as service from './service';

export const exchangeRatesRouter = Router();

const listQuerySchema = paginationSchema.extend({
  source: z.enum(EXCHANGE_RATE_SOURCES).optional(),
});

exchangeRatesRouter.use(requireAuth);

exchangeRatesRouter.get(
  '/current',
  requirePermission(PERMISSIONS.RATES_READ),
  async (_req, res, next) => {
    try {
      ok(res, await service.current());
    } catch (err) {
      next(err);
    }
  },
);

exchangeRatesRouter.get(
  '/',
  requirePermission(PERMISSIONS.RATES_READ),
  validate(listQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, source } = req.query as unknown as {
        page: number;
        limit: number;
        source?: 'bcv' | 'paralelo';
      };
      const { rows, total } = await service.list({ page, limit, source });
      paginated(res, rows, { page, limit, total });
    } catch (err) {
      next(err);
    }
  },
);

exchangeRatesRouter.post(
  '/',
  requirePermission(PERMISSIONS.RATES_CREATE),
  validate(createExchangeRateSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body, req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);
