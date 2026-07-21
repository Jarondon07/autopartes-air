import type { ReactNode } from 'react';
import {
  ApartmentOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  InboxOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PERMISSIONS, type PermissionCode } from '@autopartes-air/shared';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
  /** Permiso requerido para ver el item. Si falta, siempre visible. */
  permission?: PermissionCode;
}

export interface NavSection {
  key: string;
  title: string;
  items: NavItem[];
}

/**
 * Navegación del sidebar, agrupada por secciones (como AdminKit).
 * Los items se filtran en runtime según los permisos del usuario.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'principal',
    title: 'Principal',
    items: [
      { key: 'dashboard', label: 'Dashboard', path: '/', icon: <DashboardOutlined /> },
      {
        key: 'productos',
        label: 'Productos',
        path: '/productos',
        icon: <AppstoreOutlined />,
        permission: PERMISSIONS.PRODUCTS_READ,
      },
      {
        key: 'ventas',
        label: 'Ventas',
        path: '/ventas',
        icon: <ShoppingCartOutlined />,
        permission: PERMISSIONS.SALES_CREATE,
      },
    ],
  },
  {
    key: 'inventario',
    title: 'Inventario',
    items: [
      {
        key: 'compras',
        label: 'Compras',
        path: '/compras',
        icon: <InboxOutlined />,
        permission: PERMISSIONS.PURCHASES_READ,
      },
      {
        key: 'inventario',
        label: 'Inventario',
        path: '/inventario',
        icon: <ApartmentOutlined />,
        permission: PERMISSIONS.INVENTORY_READ,
      },
      {
        key: 'proveedores',
        label: 'Proveedores',
        path: '/proveedores',
        icon: <ShopOutlined />,
        permission: PERMISSIONS.SUPPLIERS_READ,
      },
    ],
  },
  {
    key: 'gestion',
    title: 'Gestión',
    items: [
      {
        key: 'clientes',
        label: 'Clientes',
        path: '/clientes',
        icon: <TeamOutlined />,
        permission: PERMISSIONS.CLIENTS_READ,
      },
      {
        key: 'tasas',
        label: 'Tasas de cambio',
        path: '/tasas',
        icon: <DollarOutlined />,
        permission: PERMISSIONS.RATES_READ,
      },
      {
        key: 'reportes',
        label: 'Reportes',
        path: '/reportes',
        icon: <BarChartOutlined />,
      },
      {
        key: 'usuarios',
        label: 'Usuarios',
        path: '/usuarios',
        icon: <UserOutlined />,
        permission: PERMISSIONS.USERS_MANAGE,
      },
    ],
  },
];

/** Todos los items en una lista plana (para definir rutas). */
export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
