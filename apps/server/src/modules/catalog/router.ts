import { Router } from 'express';
import { z } from 'zod';
import { ok, paginated } from '../../lib/respond';
import { tooManyRequests } from '../../middleware/error';
import { validate } from '../../middleware/validate';
import * as service from './service';

/**
 * Catálogo público: las únicas rutas de la API sin `requireAuth`.
 *
 * Al estar abiertas a internet llevan dos frenos que el resto no necesita:
 * un límite de peticiones por IP y una caché corta, para que una ráfaga no se
 * traduzca en una ráfaga de consultas a PostgreSQL.
 */
export const catalogRouter = Router();

const catalogQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  carBrandId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  // Tope alto para poder armar el PDF de una sola vez, pero acotado.
  limit: z.coerce.number().int().min(1).max(200).default(24),
});

// --- Límite por IP -----------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;
const hits = new Map<string, { count: number; resetAt: number }>();

catalogRouter.use((req, _res, next) => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);

  const ip = req.ip ?? 'desconocida';
  const bucket = hits.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > MAX_PER_WINDOW) {
    return next(tooManyRequests('Demasiadas peticiones. Intenta de nuevo en un minuto.'));
  }
  next();
});

// --- Caché en memoria --------------------------------------------------------

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

// --- Rutas -------------------------------------------------------------------

catalogRouter.get('/catalog', validate(catalogQuerySchema, 'query'), async (req, res, next) => {
  try {
    const f = req.query as never as service.CatalogFilters;
    const { rows, total } = await cached(`catalog:${JSON.stringify(f)}`, () =>
      service.listCatalog(f),
    );
    paginated(res, rows, { page: f.page, limit: f.limit, total });
  } catch (err) {
    next(err);
  }
});

/** Categorías y marcas de vehículo, para los filtros de la pantalla pública. */
catalogRouter.get('/catalog/filters', async (_req, res, next) => {
  try {
    ok(res, await cached('filters', service.catalogFilters));
  } catch (err) {
    next(err);
  }
});

/** Tasas del día, para mostrar los precios también en bolívares. */
catalogRouter.get('/catalog/rates', async (_req, res, next) => {
  try {
    ok(res, await cached('rates', service.catalogRates));
  } catch (err) {
    next(err);
  }
});
