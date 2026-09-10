import { Router, type Response } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  setSecurityPinSchema,
  updateProfileSchema,
} from '@autopartes-air/shared';
import { cookieSecure } from '../../infra/env';
import { requireAuth, requireAuthAllowPasswordChange } from '../../middleware/auth';
import { unauthorized } from '../../middleware/error';
import { validate } from '../../middleware/validate';
import * as authService from './service';
import { rememberOf } from './service';

export const authRouter = Router();

const REFRESH_COOKIE = 'refresh_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deja la cookie del refresh token.
 *
 * Con "Recordarme" dura 7 días en disco; sin él se emite como **cookie de
 * sesión** (sin `maxAge`), que el navegador borra al cerrarse. En una caja
 * compartida esa es justamente la diferencia que el usuario espera al no
 * marcar la casilla.
 */
function setRefreshCookie(res: Response, token: string, remember: boolean) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth',
    ...(remember ? { maxAge: SEVEN_DAYS_MS } : {}),
  });
}

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password, remember } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(
      username,
      password,
      remember ?? false,
    );
    setRefreshCookie(res, refreshToken, remember ?? false);
    res.json({ success: true, data: { user, accessToken } });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw unauthorized('No hay sesión activa');
    // El modo viaja dentro del refresh token: al renovarlo hay que respetarlo,
    // o una sesión "sin recordarme" se volvería persistente en el primer refresh.
    const { user, accessToken, refreshToken, remember } = await authService.refresh(token);
    setRefreshCookie(res, refreshToken, remember);
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
      const { user, accessToken, refreshToken, remember } = await authService.changePassword(
        req.user!.sub,
        currentPassword,
        newPassword,
        // Se conserva el modo de la sesión que se está reemplazando.
        rememberOf(req.cookies?.[REFRESH_COOKIE]),
      );
      setRefreshCookie(res, refreshToken, remember);
      res.json({ success: true, data: { user, accessToken } });
    } catch (err) {
      next(err);
    }
  },
);

// PIN de autorización propio: lo fija cada usuario, nunca un administrador
// (un PIN que otro conoce no avala nada).
authRouter.put(
  '/security-pin',
  requireAuth,
  validate(setSecurityPinSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, pin } = req.body;
      const user = await authService.setSecurityPin(req.user!.sub, currentPassword, pin);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
);
