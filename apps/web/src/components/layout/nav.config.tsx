import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  BarChartOutlined,
  CarOutlined,
  ContainerOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DollarOutlined,
  InboxOutlined,
  PercentageOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PERMISSIONS, type PermissionCode } from '@autopartes-air/shared';

/** Permiso(s) requeridos para ver un item. Array = basta con tener uno. */
type Permission = PermissionCode | PermissionCode[];

/** Hoja del menú: enlaza a una ruta concreta. */
export interface NavLeaf {
  key: string;
  label: string;
  path: string;
  icon?: ReactNode;
  permission?: Permission;
}

/** Nodo con submenú: agrupa hojas, sin ruta propia. */
export interface NavParent {
  key: string;
  label: string;
  icon: ReactNode;
  children: NavLeaf[];
}

export type NavNode = NavLeaf | NavParent;

export function isParent(node: NavNode): node is NavParent {
  return (node as NavParent).children !== undefined;
}

/**
 * Estructura de navegación del sistema (menú lateral).
 * El filtrado por permisos se resuelve en runtime en el Sidebar.
 */
export const NAV_TREE: NavNode[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: <DashboardOutlined />,
  },
  {
    key: 'productos',
    label: 'Productos',
    icon: <AppstoreOutlined />,
    children: [
      {
        key: 'productos-gestionar',
        label: 'Gestionar',
        path: '/productos',
        icon: <UnorderedListOutlined />,
        permission: PERMISSIONS.PRODUCTS_READ,
      },
      {
        key: 'productos-inventario',
        label: 'Inventario',
        path: '/inventario',
        icon: <InboxOutlined />,
        permission: PERMISSIONS.INVENTORY_READ,
      },
    ],
  },
  {
    key: 'compras',
    label: 'Compras',
    icon: <ShoppingOutlined />,
    children: [
      {
        key: 'compras-lotes',
        label: 'Lotes',
        path: '/compras',
        icon: <ContainerOutlined />,
        permission: PERMISSIONS.PURCHASES_READ,
      },
      {
        key: 'compras-proveedores',
        label: 'Proveedores',
        path: '/proveedores',
        icon: <ShopOutlined />,
        permission: PERMISSIONS.SUPPLIERS_READ,
      },
    ],
  },
  {
    key: 'ventas',
    label: 'Ventas',
    icon: <ShoppingCartOutlined />,
    children: [
      {
        key: 'ventas-caja',
        label: 'Cajero (Vender)',
        path: '/ventas/caja',
        icon: <DollarOutlined />,
        permission: PERMISSIONS.SALES_CREATE,
      },
      {
        key: 'ventas-lista',
        label: 'Ventas',
        path: '/ventas',
        icon: <ProfileOutlined />,
        permission: [PERMISSIONS.SALES_READ_OWN, PERMISSIONS.SALES_READ_ALL],
      },
      {
        key: 'ventas-deudas',
        label: 'Deudas',
        path: '/ventas/deudas',
        icon: <CreditCardOutlined />,
        permission: [PERMISSIONS.SALES_READ_OWN, PERMISSIONS.SALES_READ_ALL],
      },
    ],
  },
  {
    key: 'clientes',
    label: 'Clientes',
    path: '/clientes',
    icon: <TeamOutlined />,
    permission: PERMISSIONS.CLIENTS_READ,
  },
  {
    key: 'reportes',
    label: 'Reportes',
    path: '/reportes',
    icon: <BarChartOutlined />,
    permission: [
      PERMISSIONS.REPORTS_SALES,
      PERMISSIONS.REPORTS_INVENTORY,
      PERMISSIONS.REPORTS_CASH,
      PERMISSIONS.REPORTS_ALL,
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración',
    icon: <SettingOutlined />,
    children: [
      {
        key: 'config-usuarios',
        label: 'Usuarios',
        path: '/configuracion/usuarios',
        icon: <UserOutlined />,
        permission: PERMISSIONS.USERS_MANAGE,
      },
      {
        key: 'config-roles',
        label: 'Roles y permisos',
        path: '/configuracion/roles',
        icon: <SafetyCertificateOutlined />,
        permission: PERMISSIONS.USERS_MANAGE,
      },
      {
        key: 'config-categorias',
        label: 'Categorías',
        path: '/configuracion/categorias',
        icon: <TagsOutlined />,
        permission: PERMISSIONS.PRODUCTS_READ,
      },
      {
        key: 'config-marcas-vehiculos',
        label: 'Marcas de vehículos',
        path: '/configuracion/marcas-vehiculos',
        icon: <CarOutlined />,
        permission: PERMISSIONS.PRODUCTS_READ,
      },
      {
        key: 'config-tasas',
        label: 'Tasas de cambio',
        path: '/configuracion/tasas',
        icon: <DollarOutlined />,
        permission: PERMISSIONS.RATES_READ,
      },
      {
        key: 'config-impuestos',
        label: 'Impuestos',
        path: '/configuracion/impuestos',
        icon: <PercentageOutlined />,
        permission: PERMISSIONS.USERS_MANAGE,
      },
    ],
  },
];

/** Todas las hojas en una lista plana (para generar rutas). */
export const NAV_LEAVES: NavLeaf[] = NAV_TREE.flatMap((node) =>
  isParent(node) ? node.children : [node],
);

/** ¿El usuario tiene el/los permiso(s) requeridos por el item? */
export function canSee(permissions: PermissionCode[], required?: Permission): boolean {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => permissions.includes(p));
}
