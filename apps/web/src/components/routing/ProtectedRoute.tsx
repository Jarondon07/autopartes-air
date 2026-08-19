import { Spin } from 'antd';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { ForcePasswordChangePage } from '../../pages/ForcePasswordChangePage';

interface Props {
  /** True mientras el bootstrap de sesión sigue resolviéndose. */
  bootstrapping: boolean;
}

/** Bloquea el acceso a rutas privadas si no hay sesión. */
export function ProtectedRoute({ bootstrapping }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword ?? false);

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

  // Contraseña provisional: no se entra a ninguna ruta hasta cambiarla. Se
  // renderiza en lugar del layout (sin cambiar la URL) para que no haya forma
  // de esquivarlo navegando. La autoridad real está en el servidor, que
  // responde 403 PASSWORD_CHANGE_REQUIRED a todo lo demás.
  if (mustChangePassword) {
    return <ForcePasswordChangePage />;
  }

  return <Outlet />;
}
