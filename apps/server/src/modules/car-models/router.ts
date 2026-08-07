import { Router } from 'express';
import { z } from 'zod';
import {
  PERMISSIONS,
  carModelSchema,
  idParamSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/respond';
import * as service from './service';

export const carModelsRouter = Router();

const listQuerySchema = z.object({
  brandId: z.coerce.number().int().positive().optional(),
});

carModelsRouter.use(requireAuth);

carModelsRouter.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validate(listQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { brandId } = req.query as unknown as { brandId?: number };
      ok(res, await service.list(brandId));
    } catch (err) {
      next(err);
    }
  },
);

carModelsRouter.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  validate(carModelSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body));
    } catch (err) {
      next(err);
    }
  },
);

carModelsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate(idParamSchema, 'params'),
  validate(carModelSchema),
  async (req, res, next) => {
    try {
      ok(res, await service.update(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  },
);

carModelsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.remove(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);
