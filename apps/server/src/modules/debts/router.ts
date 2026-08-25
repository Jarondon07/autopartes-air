import { Router } from 'express';
import {
  PERMISSIONS,
  addDebtPaymentSchema,
  debtFiltersSchema,
  idParamSchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { created, ok, paginated } from '../../lib/respond';
import * as service from './service';

export const debtsRouter = Router();

debtsRouter.use(requireAuth);

debtsRouter.get(
  '/',
  requirePermission(PERMISSIONS.DEBTS_READ),
  validate(debtFiltersSchema, 'query'),
  async (req, res, next) => {
    try {
      const filters = req.query as never as import('@autopartes-air/shared').DebtFilters;
      const { rows, total } = await service.list(filters);
      paginated(res, rows, { page: filters.page, limit: filters.limit, total });
    } catch (err) {
      next(err);
    }
  },
);

// Antes de '/:id' para que no lo capture la ruta con parámetro.
debtsRouter.get('/summary', requirePermission(PERMISSIONS.DEBTS_READ), async (req, res, next) => {
  try {
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    ok(res, await service.summary(clientId));
  } catch (err) {
    next(err);
  }
});

debtsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.DEBTS_READ),
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      ok(res, await service.getById(Number(req.params.id)));
    } catch (err) {
      next(err);
    }
  },
);

/** Abono contra una deuda. */
debtsRouter.post(
  '/:id/payments',
  requirePermission(PERMISSIONS.DEBTS_PAY),
  validate(idParamSchema, 'params'),
  validate(addDebtPaymentSchema),
  async (req, res, next) => {
    try {
      created(res, await service.addPayment(Number(req.params.id), req.body, req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);
