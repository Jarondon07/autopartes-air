import { Router, type Response } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  updateProfileSchema,
} from '@autopartes-air/shared';
import { cookieSecure } from '../../infra/env';
import { requireAuth, requireAuthAllowPasswordChange } from '../../middleware/auth';
import { unauthorized } from '../../middleware/error';
import { validate } from '../../middleware/validate';
import * as authService from './service';

export const authRouter = Router();

const REFRESH_COOKIE = 'refresh_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: SEVEN_DAYS_MS,
  });
}

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(username, password);
    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized('No hay sesión activa');
    const { user, accessToken, refreshToken } = await authService.refresh(token);
    setRefreshCookie(res, refreshToken);
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  // Los atributos deben coincidir con los de `setRefreshCookie` para que el borrado surta efecto.
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
  res.json({ success: true, data: null });
});

// Accesible con contraseña provisional: el frontend necesita identificar al
// usuario para mostrarle la pantalla de cambio obligatorio.
authRouter.get('/me', requireAuthAllowPasswordChange, async (req, res, next) => {
  try {
    const user = await authService.me(req.user!.sub);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

authRouter.patch(
  '/me',
  requireAuth,
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      const user = await authService.updateProfile(req.user!.sub, req.body.fullName);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
);

// La ruta que desbloquea: por definición se usa con la contraseña provisional.
// Devuelve sesión nueva porque el token viejo lleva el flag encendido.
authRouter.post(
  '/change-password',
  requireAuthAllowPasswordChange,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const { user, accessToken, refreshToken } = await authService.changePassword(
        req.user!.sub,
        currentPassword,
        newPassword,
      );
      setRefreshCookie(res, refreshToken);
      res.json({ success: true, data: { user, accessToken } });
    } catch (err) {
      next(err);
    }
  },
);
