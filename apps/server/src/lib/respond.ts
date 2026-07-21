import type { Response } from 'express';

/** Respuesta de éxito estándar: { success: true, data }. */
export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

/** Respuesta 201 para recursos recién creados. */
export function created<T>(res: Response, data: T): Response {
  return ok(res, data, 201);
}

/** Respuesta paginada: agrega meta { page, limit, total }. */
export function paginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; total: number },
): Response {
  return res.json({ success: true, data, meta });
}
