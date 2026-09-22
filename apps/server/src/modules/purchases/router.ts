import { Router } from 'express';
import {
  PERMISSIONS,
  createPurchaseSchema,
  idParamSchema,
  purchaseFiltersSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import * as service from './service';

export const purchasesRouter = Router();

purchasesRouter.use(requireAuth);

purchasesRouter.get(
  '/',
  requirePermission(PERMISSIONS.PURCHASES_READ),
  validate(purchaseFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const filters = req.query as never;
      const { rows, total } = await service.list(filters);
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      paginated(res, rows, { page, limit, total });
    } catch (err) {
      next(err);
    }
  },
);

purchasesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.PURCHASES_READ),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.getById(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);

purchasesRouter.post(
  '/',
  requirePermission(PERMISSIONS.PURCHASES_CREATE),
  validate(createPurchaseSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body, req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);
