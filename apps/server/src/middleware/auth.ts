import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { PermissionCode, RoleName } from '@autopartes-air/shared';
import { env } from '../infra/env';
import { unauthorized } from './error';

export interface AccessTokenPayload {
  sub: number;
  username: string;
  role: RoleName;
  permissions: PermissionCode[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/** Exige un access token válido en Authorization: Bearer <token>. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenPayload;
    req.user = payload;
    next();
  } catch {
    next(unauthorized('Token inválido o expirado'));
  }
}
