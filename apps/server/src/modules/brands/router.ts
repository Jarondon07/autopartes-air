import { Router } from 'express';
import { PERMISSIONS, brandSchema, idParamSchema } from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/respond';
import * as service from './service';

export const brandsRouter = Router();

brandsRouter.use(requireAuth);

brandsRouter.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  async (_req, res, next) => {
    try {
      ok(res, await service.list());
    } catch (err) {
      next(err);
    }
  },
);

brandsRouter.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  validate(brandSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body));
    } catch (err) {
      next(err);
    }
  },
);

brandsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate(idParamSchema, 'params'),
  validate(brandSchema),
  async (req, res, next) => {
    try {
      ok(res, await service.update(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  },
);

brandsRouter.delete(
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
