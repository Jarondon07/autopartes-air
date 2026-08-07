import { Router } from 'express';
import {
  PERMISSIONS,
  createRoleSchema,
  idParamSchema,
  setRolePermissionsSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok } from '../../lib/respond';
import * as service from './service';

export const rolesRouter = Router();

rolesRouter.use(requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE));

rolesRouter.get('/', async (_req, res, next) => {
  try {
    ok(res, await service.list());
  } catch (err) {
    next(err);
  }
});

rolesRouter.get('/permissions', async (_req, res, next) => {
  try {
    ok(res, await service.listPermissions());
  } catch (err) {
    next(err);
  }
});

rolesRouter.post('/', validate(createRoleSchema), async (req, res, next) => {
  try {
    created(res, await service.create(req.body));
  } catch (err) {
    next(err);
  }
});

rolesRouter.put(
  '/:id/permissions',
  validate(idParamSchema, 'params'),
  validate(setRolePermissionsSchema),
  async (req, res, next) => {
    try {
      ok(res, await service.setPermissions(Number(req.params.id), req.body.permissions));
    } catch (err) {
      next(err);
    }
  },
);
