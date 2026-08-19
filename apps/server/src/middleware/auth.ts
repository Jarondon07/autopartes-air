import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { PermissionCode, RoleName } from '@autopartes-air/shared';
import { env } from '../infra/env';
import { forbidden, unauthorized } from './error';

export interface AccessTokenPayload {
  sub: number;
  username: string;
  role: RoleName;
  permissions: PermissionCode[];
  /** Contraseña provisional pendiente de cambio (ver `requireAuth`). */
  mustChangePassword?: boolean;
}

/**
 * Código que el frontend usa para llevar al usuario a la pantalla de cambio
 * obligatorio de contraseña.
 */
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/** Verifica el token y deja el payload en `req.user`. No mira el estado de la contraseña. */
function verifyToken(req: Request, next: NextFunction): AccessTokenPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized());
    return null;
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenPayload;
    req.user = payload;
    return payload;
  } catch {
    next(unauthorized('Token inválido o expirado'));
    return null;
  }
}

/**
 * Exige un access token válido en `Authorization: Bearer <token>`.
 *
 * Además bloquea al usuario con contraseña provisional: mientras no la cambie,
 * cualquier ruta protegida responde 403 `PASSWORD_CHANGE_REQUIRED`. El bloqueo
 * vive aquí (y no solo en el frontend) porque de otro modo bastaría con llamar
 * a la API directamente para saltárselo.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const payload = verifyToken(req, next);
  if (!payload) return;

  if (payload.mustChangePassword) {
    return next(
      forbidden('Debes cambiar tu contraseña antes de continuar', PASSWORD_CHANGE_REQUIRED),
    );
  }
  next();
}

/**
 * Igual que `requireAuth` pero sin el bloqueo por contraseña provisional.
 * Solo para las rutas que el usuario necesita justamente para desbloquearse
 * (ver su perfil y cambiar la contraseña).
 */
export function requireAuthAllowPasswordChange(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (verifyToken(req, next)) next();
}
