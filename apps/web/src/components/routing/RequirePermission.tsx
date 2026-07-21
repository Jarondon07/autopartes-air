import type { ReactNode } from 'react';
import { Result } from 'antd';
import type { PermissionCode } from '@autopartes-air/shared';
import { useAuthStore } from '../../stores/auth.store';

interface Props {
  permission: PermissionCode;
  children: ReactNode;
}

/** Renderiza `children` solo si el usuario tiene el permiso; si no, un 403. */
export function RequirePermission({ permission, children }: Props) {
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!hasPermission(permission)) {
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
