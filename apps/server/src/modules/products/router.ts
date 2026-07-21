import { Router } from 'express';
import {
  PERMISSIONS,
  createProductSchema,
  idParamSchema,
  productFiltersSchema,
  updateProductSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import * as service from './service';

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validate(productFiltersSchema, 'query'),
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

productsRouter.get(
  '/search',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  async (req, res, next) => {
    try {
      const q = String(req.query.q ?? '').trim();
      ok(res, q ? await service.search(q) : []);
    } catch (err) {
      next(err);
    }
  },
);

productsRouter.get(
  '/low-stock',
  requirePermission(PERMISSIONS.PRODUCTS_READ, PERMISSIONS.INVENTORY_READ),
  async (_req, res, next) => {
    try {
      ok(res, await service.lowStock());
    } catch (err) {
      next(err);
    }
  },
);

productsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.getById(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);

productsRouter.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  validate(createProductSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body));
    } catch (err) {
      next(err);
    }
  },
);

productsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validate(idParamSchema, 'params'),
  validate(updateProductSchema),
  async (req, res, next) => {
    try {
      ok(res, await service.update(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  },
);

productsRouter.delete(
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
