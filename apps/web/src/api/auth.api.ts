import type { ApiSuccess, AuthUser, LoginInput, LoginResponse } from '@autopartes-air/shared';
import { api } from './client';

/** POST /auth/login — devuelve usuario + access token; setea cookie de refresh. */
export async function login(input: LoginInput): Promise<LoginResponse> {
  const { data } = await api.post<ApiSuccess<LoginResponse>>('/auth/login', input);
  return data.data;
}

/** POST /auth/refresh — renueva el access token vía cookie httpOnly. */
export async function refresh(): Promise<LoginResponse> {
  const { data } = await api.post<ApiSuccess<LoginResponse>>('/auth/refresh');
  return data.data;
}

/** GET /auth/me — usuario autenticado actual. */
export async function me(): Promise<AuthUser> {
  const { data } = await api.get<ApiSuccess<AuthUser>>('/auth/me');
  return data.data;
}

/** POST /auth/logout — limpia la cookie de refresh en el servidor. */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}
