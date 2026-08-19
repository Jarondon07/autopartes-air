import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiErrorBody, LoginResponse } from '@autopartes-air/shared';
import { getAccessToken, useAuthStore } from '../stores/auth.store';

/**
 * Cliente HTTP central.
 * - baseURL `/api/v1` (Vite hace proxy a http://localhost:4300).
 * - `withCredentials` para enviar la cookie httpOnly del refresh token.
 * - Interceptor request: adjunta el access token.
 * - Interceptor response: en 401 intenta un refresh silencioso y reintenta.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Cliente separado (sin interceptores) para el refresh, evita bucles.
const refreshClient = axios.create({ baseURL: '/api/v1', withCredentials: true });

let refreshPromise: Promise<string | null> | null = null;

/** Pide un nuevo access token usando la cookie del refresh token. */
async function requestRefresh(): Promise<string | null> {
  try {
    const { data } = await refreshClient.post<{ success: true; data: LoginResponse }>(
      '/auth/refresh',
    );
    const { accessToken, user } = data.data;
    useAuthStore.getState().setSession(accessToken, user);
    return accessToken;
  } catch {
    useAuthStore.getState().clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const isAuthEndpoint = original?.url?.includes('/auth/');

    // Contraseña provisional: el servidor rechaza todo lo demás hasta cambiarla.
    // Se marca en el store para que la app muestre la pantalla de cambio en vez
    // de una cascada de errores sueltos.
    if (
      error.response?.status === 403 &&
      error.response.data?.error?.code === 'PASSWORD_CHANGE_REQUIRED'
    ) {
      useAuthStore.getState().markMustChangePassword();
    }

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      // Un único refresh compartido entre peticiones concurrentes.
      refreshPromise ??= requestRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      }
      // Sesión perdida: redirigir a login.
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/** Extrae un mensaje legible de un error de Axios. */
export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error'): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.error?.message ?? error.message ?? fallback;
  }
  return fallback;
}
