import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { NAV_LEAVES, type NavLeaf } from './components/layout/nav.config';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RequirePermission } from './components/routing/RequirePermission';
import { useSessionBootstrap } from './hooks/useAuth';
import { PERMISSIONS } from '@autopartes-air/shared';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { CatalogPage } from './pages/CatalogPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProductsPage } from './pages/products/ProductsPage';
import { ProductFormPage } from './pages/products/ProductFormPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { ExchangeRatesPage } from './pages/exchange-rates/ExchangeRatesPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { PurchasesPage } from './pages/purchases/PurchasesPage';
import { CajeroPage } from './pages/sales/CajeroPage';
import { SalesListPage } from './pages/sales/SalesListPage';
import { DebtsPage } from './pages/sales/DebtsPage';
import { UsersPage } from './pages/config/UsersPage';
import { RolesPage } from './pages/config/RolesPage';
import { CarBrandsPage } from './pages/config/CarBrandsPage';
import { TaxesPage } from './pages/config/TaxesPage';
import { WarehousesPage } from './pages/config/WarehousesPage';
import { ReportsPage } from './pages/reports/ReportsPage';

/** Páginas ya implementadas, por ruta. El resto usa PlaceholderPage. */
const IMPLEMENTED: Record<string, ReactNode> = {
  '/productos': <ProductsPage />,
  '/inventario': <InventoryPage />,
  '/compras': <PurchasesPage />,
  '/ventas/caja': <CajeroPage />,
  '/ventas/deudas': <DebtsPage />,
  '/ventas': <SalesListPage />,
  '/clientes': <ClientsPage />,
  '/proveedores': <SuppliersPage />,
  '/reportes': <ReportsPage />,
  '/configuracion/usuarios': <UsersPage />,
  '/configuracion/roles': <RolesPage />,
  '/configuracion/categorias': <CategoriesPage />,
  '/configuracion/marcas-vehiculos': <CarBrandsPage />,
  '/configuracion/tasas': <ExchangeRatesPage />,
  '/configuracion/impuestos': <TaxesPage />,
  '/configuracion/almacenes': <WarehousesPage />,
};

/** Envuelve el elemento con control de permiso si la hoja lo requiere. */
function leafElement(leaf: NavLeaf): ReactNode {
  const element = IMPLEMENTED[leaf.path] ?? <PlaceholderPage title={leaf.label} />;
  if (!leaf.permission) return element;
  return (
    <RequirePermission permission={leaf.permission}>{element}</RequirePermission>
  );
}

export function App() {
  const { isLoading } = useSessionBootstrap();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Catálogo público: única pantalla que se ve sin iniciar sesión. */}
      <Route path="/catalogo" element={<CatalogPage />} />

      <Route element={<ProtectedRoute bootstrapping={isLoading} />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          {/* Perfil: accesible por cualquier usuario autenticado (no está en el menú) */}
          <Route path="/perfil" element={<ProfilePage />} />
          {/* Formulario de producto en pantalla completa (crear/editar) */}
          <Route
            path="/productos/nuevo"
            element={
              <RequirePermission permission={PERMISSIONS.PRODUCTS_CREATE}>
                <ProductFormPage />
              </RequirePermission>
            }
          />
          <Route
            path="/productos/:id/editar"
            element={
              <RequirePermission permission={PERMISSIONS.PRODUCTS_UPDATE}>
                <ProductFormPage />
              </RequirePermission>
            }
          />
          {NAV_LEAVES.filter((leaf) => leaf.path !== '/').map((leaf) => (
            <Route key={leaf.key} path={leaf.path} element={leafElement(leaf)} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
