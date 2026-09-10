import { create } from 'zustand';
import type { AuthUser, PermissionCode } from '@autopartes-air/shared';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** True cuando hay usuario autenticado en memoria. */
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  /** Actualiza solo el token (usado por el refresh silencioso). */
  setAccessToken: (accessToken: string) => void;
  /** Actualiza solo el usuario en memoria (ej. tras editar el perfil). */
  setUser: (user: AuthUser) => void;
  /** Marca la sesión como "debe cambiar contraseña" (ver interceptor de Axios). */
  markMustChangePassword: () => void;
  clear: () => void;
  hasPermission: (permission: PermissionCode) => boolean;
}

/**
 * Estado de autenticación en memoria.
 *
 * El access token (15 min) NO se persiste: al recargar la app se re-hidrata la
 * sesión llamando a `/auth/refresh`, que usa la cookie httpOnly del refresh token.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setSession: (accessToken, user) =>
    set({ accessToken, user, isAuthenticated: true }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setUser: (user) => set({ user }),

  markMustChangePassword: () =>
    set((s) => (s.user ? { user: { ...s.user, mustChangePassword: true } } : {})),

  clear: () => set({ accessToken: null, user: null, isAuthenticated: false }),

  hasPermission: (permission) =>
    get().user?.permissions.includes(permission) ?? false,
}));

/** Acceso al token fuera de React (interceptores de Axios). */
export const getAccessToken = () => useAuthStore.getState().accessToken;
