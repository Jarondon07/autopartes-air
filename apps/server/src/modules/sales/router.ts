import { Router } from 'express';
import {
  PERMISSIONS,
  createSaleSchema,
  idParamSchema,
  priceAuthorizationSchema,
  saleFiltersSchema,
  salesSummaryQuerySchema,
} from '@autopartes-air/shared';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { clearFailures, registerFailure, retryAfter } from '../../lib/rate-limit';
import * as authService from '../auth/service';
import { signPriceAuthToken } from './price-auth';
import { created, ok, paginated } from '../../lib/respond';
import { forbidden, tooManyRequests } from '../../middleware/error';
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

// Resumen agregado (dashboard). Debe ir ANTES de '/:id' para no ser capturado por él.
salesRouter.get(
  '/summary',
  requirePermission(PERMISSIONS.SALES_READ_OWN, PERMISSIONS.SALES_READ_ALL),
  validate(salesSummaryQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = req.query as never as import('@autopartes-air/shared').SalesSummaryQuery;
      // Sin permiso de "ver todas": el resumen se limita a las ventas propias.
      if (!canSeeAll(req)) q.userId = req.user!.sub;
      ok(res, await service.summary(q));
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

/**
 * Autoriza un precio distinto al de lista: usuario con `sales:override_price`
 * + su PIN. No cambia la sesión del cajero; devuelve un token de 5 minutos que
 * se adjunta a la venta.
 *
 * Va limitado por intentos: un PIN de 4 dígitos son 10.000 combinaciones, que
 * sin freno se prueban en segundos.
 */
const PIN_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

salesRouter.post(
  '/price-authorization',
  requirePermission(PERMISSIONS.SALES_CREATE),
  validate(priceAuthorizationSchema),
  async (req, res, next) => {
    const { username, pin } = req.body as { username: string; pin: string };
    // Se limita por usuario a autorizar, no por IP: en la tienda todos los
    // equipos salen por la misma IP y se bloquearían entre sí.
    const key = `pin:${username.toLowerCase()}`;
    try {
      const wait = retryAfter(key, PIN_LIMIT);
      if (wait > 0) {
        throw tooManyRequests(
          `Demasiados intentos fallidos. Espera ${Math.ceil(wait / 60)} minuto(s).`,
        );
      }

      let authorizer;
      try {
        authorizer = await authService.verifySecurityPin(
          username,
          pin,
          PERMISSIONS.SALES_OVERRIDE_PRICE,
        );
      } catch (err) {
        registerFailure(key, PIN_LIMIT);
        throw err;
      }
      clearFailures(key);

      ok(res, {
        token: signPriceAuthToken(authorizer.id, authorizer.fullName),
        authorizedBy: authorizer.fullName,
      });
    } catch (err) {
      next(err);
    }
  },
);
