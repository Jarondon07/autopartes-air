import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { LoginInput } from '@autopartes-air/shared';
import * as authApi from '../api/auth.api';
import { useAuthStore } from '../stores/auth.store';

/** Mutation de login → guarda la sesión en el store. */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: ({ accessToken, user }) => setSession(accessToken, user),
  });
}

/** Cierra sesión en el servidor y limpia el estado local. */
export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: () => authApi.logout(),
    // Limpiar siempre, aunque el logout del servidor falle.
    onSettled: () => clear(),
  });
}

/**
 * Re-hidrata la sesión al montar la app llamando a `/auth/refresh`
 * (usa la cookie httpOnly). Devuelve `isLoading` para mostrar un spinner
 * inicial mientras se resuelve.
 */
export function useSessionBootstrap() {
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi
      .refresh()
      .then(({ accessToken, user }) => {
        if (active) setSession(accessToken, user);
      })
      .catch(() => {
        if (active) clear();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setSession, clear]);

  return { isLoading };
}
