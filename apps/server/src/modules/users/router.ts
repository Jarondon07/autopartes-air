import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  PERMISSIONS,
  ROOT_ROLE,
  createUserSchema,
  idParamSchema,
  paginationSchema,
  resetPasswordSchema,
  updateUserSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import { badRequest, forbidden, notFound } from '../../middleware/error';
import * as service from './service';

export const usersRouter = Router();

const listQuerySchema = paginationSchema.extend({
  q: z.string().max(100).optional(),
});

const isRoot = (req: Request) => req.user!.role === ROOT_ROLE;

/** Oculta a los usuarios root de quien no es root (responde 404 como si no existiera). */
async function assertTargetVisible(req: Request, id: number) {
  const roleName = await service.getUserRoleName(id);
  if (roleName === null) throw notFound('Usuario no encontrado');
  if (roleName === ROOT_ROLE && !isRoot(req)) throw notFound('Usuario no encontrado');
}

/** Solo root puede asignar el rol root a un usuario. */
async function assertRoleAssignable(req: Request, roleId?: number) {
  if (roleId === undefined) return;
  const roleName = await service.getRoleNameById(roleId);
  if (roleName === ROOT_ROLE && !isRoot(req)) {
    throw forbidden('No tienes permiso para asignar ese rol');
  }
}

usersRouter.use(requireAuth, requirePermission(PERMISSIONS.USERS_MANAGE));

usersRouter.get('/', validate(listQuerySchema, 'query'), async (req, res, next) => {
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
});

usersRouter.post('/', validate(createUserSchema), async (req, res, next) => {
  try {
    await assertRoleAssignable(req, req.body.roleId);
    created(res, await service.create(req.body));
  } catch (err) {
    next(err);
  }
});

usersRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateUserSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await assertTargetVisible(req, id);
      await assertRoleAssignable(req, req.body.roleId);
      // No permitir que un admin se desactive a sí mismo (evita quedar fuera).
      if (id === req.user!.sub && req.body.isActive === false) {
        throw badRequest('No puedes desactivar tu propio usuario');
      }
      ok(res, await service.update(id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.post(
  '/:id/reset-password',
  validate(idParamSchema, 'params'),
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await assertTargetVisible(req, id);
      await service.resetPassword(id, req.body.password);
      ok(res, { success: true });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.delete('/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await assertTargetVisible(req, id);
    if (id === req.user!.sub) {
      throw badRequest('No puedes eliminar tu propio usuario');
    }
    await service.remove(id);
    ok(res, { success: true });
  } catch (err) {
    next(err);
  }
});
