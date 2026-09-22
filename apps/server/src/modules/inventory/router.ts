import { Router } from 'express';
import { z } from 'zod';
import {
  MOVEMENT_TYPES,
  PERMISSIONS,
  inventoryAdjustmentSchema,
  paginationSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import * as service from './service';

export const inventoryRouter = Router();

const movementsQuerySchema = paginationSchema.extend({
  productId: z.coerce.number().int().positive().optional(),
  movementType: z.enum(MOVEMENT_TYPES).optional(),
});

inventoryRouter.use(requireAuth);

inventoryRouter.get(
  '/movements',
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validate(movementsQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, productId, movementType } = req.query as unknown as {
        page: number;
        limit: number;
        productId?: number;
        movementType?: (typeof MOVEMENT_TYPES)[number];
      };
      const { rows, total } = await service.listMovements({
        page,
        limit,
        productId,
        movementType,
      });
      paginated(res, rows, { page, limit, total });
    } catch (err) {
      next(err);
    }
  },
);

inventoryRouter.post(
  '/adjustments',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  validate(inventoryAdjustmentSchema),
  async (req, res, next) => {
    try {
      const movement = await service.adjust(req.body, req.user!.sub);
      created(res, movement);
    } catch (err) {
      next(err);
    }
  },
);
