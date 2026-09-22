import { Router } from 'express';
import { PERMISSIONS, idParamSchema, warehouseSchema } from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/respond';
import * as service from './service';

export const warehousesRouter = Router();

// Cualquier usuario autenticado puede leer los almacenes (para el form de producto).
warehousesRouter.use(requireAuth);

warehousesRouter.get('/', async (_req, res, next) => {
  try {
    ok(res, await service.list());
  } catch (err) {
    next(err);
  }
});

// La gestión (crear/editar/eliminar) requiere permiso de administración.
warehousesRouter.post(
  '/',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(warehouseSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body));
    } catch (err) {
      next(err);
    }
  },
);

warehousesRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(idParamSchema, 'params'),
  validate(warehouseSchema),
  async (req, res, next) => {
    try {
      ok(res, await service.update(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  },
);

warehousesRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.remove(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);
