import { Router } from 'express';
import {
  PERMISSIONS,
  categorySchema,
  idParamSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/respond';
import * as service from './service';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get(
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

categoriesRouter.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  validate(categorySchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body));
    } catch (err) {
      next(err);
    }
  },
);

categoriesRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate(idParamSchema, 'params'),
  validate(categorySchema),
  async (req, res, next) => {
    try {
      ok(res, await service.update(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  },
);

categoriesRouter.delete(
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
