import { Router } from 'express';
import { PERMISSIONS, reportRangeSchema } from '@autopartes-air/shared';
import type { ReportRange } from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { ok } from '../../lib/respond';
import * as service from './service';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

const asRange = (req: { query: unknown }) => req.query as never as ReportRange;

// --- Ventas ---
reportsRouter.get(
  '/sales/daily',
  requirePermission(PERMISSIONS.REPORTS_SALES, PERMISSIONS.REPORTS_ALL),
  validate(reportRangeSchema, 'query'),
  async (req, res, next) => {
    try {
      ok(res, await service.salesByDay(asRange(req)));
    } catch (err) {
      next(err);
    }
  },
);

reportsRouter.get(
  '/sales/top-products',
  requirePermission(PERMISSIONS.REPORTS_SALES, PERMISSIONS.REPORTS_ALL),
  validate(reportRangeSchema, 'query'),
  async (req, res, next) => {
    try {
      ok(res, await service.topProducts(asRange(req)));
    } catch (err) {
      next(err);
    }
  },
);

// --- Caja (cuadre por método de pago) ---
reportsRouter.get(
  '/sales/by-payment',
  requirePermission(PERMISSIONS.REPORTS_CASH, PERMISSIONS.REPORTS_ALL),
  validate(reportRangeSchema, 'query'),
  async (req, res, next) => {
    try {
      ok(res, await service.salesByPayment(asRange(req)));
    } catch (err) {
      next(err);
    }
  },
);

// --- Inventario ---
reportsRouter.get(
  '/inventory/summary',
  requirePermission(PERMISSIONS.REPORTS_INVENTORY, PERMISSIONS.REPORTS_ALL),
  async (_req, res, next) => {
    try {
      ok(res, await service.inventorySummary());
    } catch (err) {
      next(err);
    }
  },
);
