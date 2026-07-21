import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ALL_NAV_ITEMS } from './components/layout/nav.config';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RequirePermission } from './components/routing/RequirePermission';
import { useSessionBootstrap } from './hooks/useAuth';
import { PERMISSIONS } from '@autopartes-air/shared';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProductsPage } from './pages/products/ProductsPage';

/** Módulos ya implementados: no usan PlaceholderPage. */
const IMPLEMENTED_PATHS = new Set(['/', '/productos']);

/** Rutas de módulos aún no implementados → PlaceholderPage. */
const PLACEHOLDER_ROUTES = ALL_NAV_ITEMS.filter(
  (it) => !IMPLEMENTED_PATHS.has(it.path),
);

export function App() {
  const { isLoading } = useSessionBootstrap();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute bootstrapping={isLoading} />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="/productos"
            element={
              <RequirePermission permission={PERMISSIONS.PRODUCTS_READ}>
                <ProductsPage />
              </RequirePermission>
            }
          />
          {PLACEHOLDER_ROUTES.map((it) => (
            <Route
              key={it.key}
              path={it.path}
              element={<PlaceholderPage title={it.label} />}
            />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
