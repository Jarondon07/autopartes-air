import { Spin } from 'antd';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

interface Props {
  /** True mientras el bootstrap de sesión sigue resolviéndose. */
  bootstrapping: boolean;
}

/** Bloquea el acceso a rutas privadas si no hay sesión. */
export function ProtectedRoute({ bootstrapping }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (bootstrapping) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
