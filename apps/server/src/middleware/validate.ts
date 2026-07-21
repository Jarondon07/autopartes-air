import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

type Target = 'body' | 'query' | 'params';

/** Valida y transforma req[target] con un schema Zod. Lanza ZodError → 400. */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) return next(result.error);
    // req.query es getter-only en Express 5/tipos nuevos; asignamos con defineProperty
    Object.defineProperty(req, target, { value: result.data, writable: true });
    next();
  };
}
