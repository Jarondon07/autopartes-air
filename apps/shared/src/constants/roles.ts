export const ROLES = {
  ADMIN: 'admin',
  VENDEDOR: 'vendedor',
  ALMACEN: 'almacen',
  CAJERO: 'cajero',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Productos y catálogos auxiliares (categorías, marcas, vehículos)
  PRODUCTS_READ: 'products:read',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',

  // Ventas
  SALES_CREATE: 'sales:create',
  SALES_READ_OWN: 'sales:read_own',
  SALES_READ_ALL: 'sales:read_all',
  SALES_VOID: 'sales:void',

  // Compras
  PURCHASES_READ: 'purchases:read',
  PURCHASES_CREATE: 'purchases:create',

  // Inventario
  INVENTORY_READ: 'inventory:read',
  INVENTORY_ADJUST: 'inventory:adjust',

  // Clientes
  CLIENTS_READ: 'clients:read',
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_UPDATE: 'clients:update',
  CLIENTS_DELETE: 'clients:delete',

  // Proveedores
  SUPPLIERS_READ: 'suppliers:read',
  SUPPLIERS_CREATE: 'suppliers:create',
  SUPPLIERS_UPDATE: 'suppliers:update',
  SUPPLIERS_DELETE: 'suppliers:delete',

  // Tasas de cambio
  RATES_READ: 'exchange_rates:read',
  RATES_CREATE: 'exchange_rates:create',
  RATES_UPDATE: 'exchange_rates:update',
  RATES_DELETE: 'exchange_rates:delete',

  // Reportes
  REPORTS_SALES: 'reports:sales',
  REPORTS_INVENTORY: 'reports:inventory',
  REPORTS_CASH: 'reports:cash',
  REPORTS_ALL: 'reports:all',

  // Usuarios
  USERS_MANAGE: 'users:manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionCode[] = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<RoleName, PermissionCode[]> = {
  [ROLES.ADMIN]: ALL_PERMISSIONS,
  [ROLES.VENDEDOR]: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_READ_OWN,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.CLIENTS_DELETE,
    PERMISSIONS.RATES_READ,
    PERMISSIONS.REPORTS_SALES,
  ],
  [ROLES.ALMACEN]: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.PURCHASES_READ,
    PERMISSIONS.PURCHASES_CREATE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.SUPPLIERS_READ,
    PERMISSIONS.SUPPLIERS_CREATE,
    PERMISSIONS.SUPPLIERS_UPDATE,
    PERMISSIONS.SUPPLIERS_DELETE,
    PERMISSIONS.RATES_READ,
    PERMISSIONS.REPORTS_INVENTORY,
  ],
  [ROLES.CAJERO]: [
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_READ_ALL,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.RATES_READ,
    PERMISSIONS.REPORTS_CASH,
  ],
};
