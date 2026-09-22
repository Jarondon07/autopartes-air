import type { ReactNode } from 'react';
import { Result } from 'antd';
import type { PermissionCode } from '@autopartes-air/shared';
import { useAuthStore } from '../../stores/auth.store';

interface Props {
  /** Permiso requerido. Si es un array, basta con tener uno de ellos. */
  permission: PermissionCode | PermissionCode[];
  children: ReactNode;
}

/** Renderiza `children` solo si el usuario tiene el/los permiso(s); si no, un 403. */
export function RequirePermission({ permission, children }: Props) {
  const user = useAuthStore((s) => s.user);
  const required = Array.isArray(permission) ? permission : [permission];
  const allowed = required.some((p) => user?.permissions.includes(p) ?? false);

  if (!allowed) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="No tienes permiso para acceder a esta sección."
      />
    );
  }

  return <>{children}</>;
}
