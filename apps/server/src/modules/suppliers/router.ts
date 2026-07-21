import { Router } from 'express';
import { z } from 'zod';
import {
  PERMISSIONS,
  idParamSchema,
  paginationSchema,
  supplierSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import * as service from './service';

export const suppliersRouter = Router();

const listQuerySchema = paginationSchema.extend({
  q: z.string().max(100).optional(),
});

suppliersRouter.use(requireAuth);

suppliersRouter.get(
  '/',
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  validate(listQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, q } = req.query as unknown as {
        page: number;
        limit: number;
        q?: string;
      };
      const { rows, total } = await service.list({ page, limit, q });
      paginated(res, rows, { page, limit, total });
    } catch (err) {
      next(err);
    }
  },
);

suppliersRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.SUPPLIERS_READ),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.getById(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);

suppliersRouter.post(
  '/',
  requirePermission(PERMISSIONS.SUPPLIERS_CREATE),
  validate(supplierSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body));
    } catch (err) {
      next(err);
    }
  },
);

suppliersRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.SUPPLIERS_UPDATE),
  validate(idParamSchema, 'params'),
  validate(supplierSchema),
  async (req, res, next) => {
    try {
      ok(res, await service.update(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  },
);

suppliersRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.SUPPLIERS_DELETE),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.remove(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);
