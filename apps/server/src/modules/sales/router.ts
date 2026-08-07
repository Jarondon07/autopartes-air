import { Router } from 'express';
import {
  PERMISSIONS,
  createSaleSchema,
  idParamSchema,
  saleFiltersSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import { forbidden } from '../../middleware/error';
import * as service from './service';

export const salesRouter = Router();

salesRouter.use(requireAuth);

/** ¿El usuario puede ver todas las ventas, o solo las propias? */
function canSeeAll(req: { user?: { permissions: string[] } }): boolean {
  return req.user?.permissions.includes(PERMISSIONS.SALES_READ_ALL) ?? false;
}

salesRouter.get(
  '/',
  requirePermission(PERMISSIONS.SALES_READ_OWN, PERMISSIONS.SALES_READ_ALL),
  validate(saleFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const filters = req.query as never as import('@autopartes-air/shared').SaleFilters;
      // Sin permiso de "ver todas": se fuerza el filtro a las ventas propias.
      if (!canSeeAll(req)) filters.userId = req.user!.sub;
      const { rows, total } = await service.list(filters);
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      paginated(res, rows, { page, limit, total });
    } catch (err) {
      next(err);
    }
  },
);

salesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.SALES_READ_OWN, PERMISSIONS.SALES_READ_ALL),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const sale = await service.getById(Number(req.params.id));
      if (!canSeeAll(req) && sale.userId !== req.user!.sub) {
        throw forbidden('No puedes ver ventas de otros usuarios');
      }
      ok(res, sale);
    } catch (err) {
      next(err);
    }
  },
);

salesRouter.post(
  '/',
  requirePermission(PERMISSIONS.SALES_CREATE),
  validate(createSaleSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body, req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);

salesRouter.post(
  '/:id/void',
  requirePermission(PERMISSIONS.SALES_VOID),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.voidSale(Number(req.params.id), req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);
