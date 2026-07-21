import type { NextFunction, Request, Response } from 'express';
import type { PermissionCode } from '@autopartes-air/shared';
import { forbidden, unauthorized } from './error';

/**
 * Exige que el usuario autenticado tenga AL MENOS UNO de los permisos dados.
 * Usar después de requireAuth.
 */
export function requirePermission(...codes: PermissionCode[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    const has = codes.some((c) => req.user!.permissions.includes(c));
    if (!has) return next(forbidden());
    next();
  };
}
