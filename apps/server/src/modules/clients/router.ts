import { Router } from 'express';
import { z } from 'zod';
import {
  PERMISSIONS,
  clientSchema,
  idParamSchema,
  paginationSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import * as service from './service';

export const clientsRouter = Router();

const listQuerySchema = paginationSchema.extend({
  q: z.string().max(100).optional(),
});

clientsRouter.use(requireAuth);

clientsRouter.get(
  '/',
  requirePermission(PERMISSIONS.CLIENTS_READ),
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

clientsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_READ),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.getById(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);

clientsRouter.post(
  '/',
  requirePermission(PERMISSIONS.CLIENTS_CREATE),
  validate(clientSchema),
  async (req, res, next) => {
    try {
      created(res, await service.create(req.body));
    } catch (err) {
      next(err);
    }
  },
);

clientsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_UPDATE),
  validate(idParamSchema, 'params'),
  validate(clientSchema),
  async (req, res, next) => {
    try {
      ok(res, await service.update(Number(req.params.id), req.body));
    } catch (err) {
      next(err);
    }
  },
);

clientsRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.CLIENTS_DELETE),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.remove(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);
