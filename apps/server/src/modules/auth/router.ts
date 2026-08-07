import { Router, type Response } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  updateProfileSchema,
} from '@autopartes-air/shared';
import { isProd } from '../../infra/env';
import { requireAuth } from '../../middleware/auth';
import { unauthorized } from '../../middleware/error';
import { validate } from '../../middleware/validate';
import * as authService from './service';

export const authRouter = Router();

const REFRESH_COOKIE = 'refresh_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
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
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.json({ success: true, data: null });
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
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

authRouter.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.sub, currentPassword, newPassword);
      res.json({ success: true, data: null });
    } catch (err) {
      next(err);
    }
  },
);
