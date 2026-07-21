# AutoparteAIR — Sistema de Gestión de Repuestos Automotrices

## Contexto

Sistema web para el control de compra, venta e inventario de repuestos de carros en Venezuela. Maneja precios en USD (canónico) y Bolívares con tasa de cambio BCV/paralelo. Diseñado para 5-15 empleados con roles diferenciados (admin, vendedor, almacén, cajero). Arquitectura API-first para permitir una app móvil en el futuro.

## Stack Tecnológico

- **Monorepo**: npm workspaces (sin Nx/Turborepo)
- **Frontend**: React + Vite + TypeScript + Ant Design
- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: PostgreSQL local
- **ORM**: Drizzle ORM (tipo-seguro, SQL legible, migraciones versionadas)
- **Validación**: Zod (compartido entre frontend y backend)
- **Estado frontend**: React Query (server state) + Zustand (solo auth y UI)
- **Auth**: JWT (access 15min + refresh 7d httpOnly cookie) + RBAC por permisos

## Estructura del Monorepo

```
autopartes-air/
├── package.json                    # npm workspaces
├── tsconfig.base.json
├── packages/
│   ├── shared/                     # @autopartes-air/shared
│   │   └── src/
│   │       ├── types/              # Interfaces TypeScript compartidas
│   │       ├── constants/          # Roles, permisos, enums
│   │       ├── validators/         # Schemas Zod
│   │       └── utils/              # Helpers de moneda, formateo
│   ├── server/                     # @autopartes-air/server
│   │   └── src/
│   │       ├── app.ts              # Express setup
│   │       ├── config/env.ts
│   │       ├── db/
│   │       │   ├── schema/         # Drizzle schema (source of truth)
│   │       │   ├── migrations/     # SQL generado por drizzle-kit
│   │       │   └── seed.ts         # Datos iniciales
│   │       ├── middleware/         # auth, rbac, validate, error
│   │       └── modules/            # auth, users, products, inventory,
│   │                               # purchases, sales, clients, suppliers,
│   │                               # exchange-rates, reports
│   │                               # Cada módulo: router.ts + service.ts
│   └── web/                        # @autopartes-air/web
│       └── src/
│           ├── api/                # Cliente Axios por módulo
│           ├── hooks/              # React Query hooks por entidad
│           ├── stores/             # auth.store.ts + ui.store.ts (Zustand)
│           ├── components/         # layout/, forms/, tables/
│           └── pages/              # Por módulo: products/, sales/, etc.
```

## Esquema de Base de Datos

### Tablas principales

| Tabla | Propósito |
|---|---|
| `roles`, `permissions`, `role_permissions` | RBAC |
| `users` | Empleados con rol asignado |
| `categories`, `brands`, `vehicles` | Catálogos auxiliares |
| `products` | Repuestos con código, costo USD, markup %, precio generado |
| `product_vehicles` | Compatibilidad repuesto-vehículo (N:M) |
| `exchange_rates` | Histórico de tasas BCV y paralelo por fecha |
| `clients` | Clientes (cédula V/J/E/P/G) |
| `suppliers` | Proveedores (RIF) |
| `purchases` + `purchase_details` | Compras a proveedores |
| `sales` + `sale_details` | Ventas a clientes |
| `inventory_movements` | Log auditable de todo movimiento de stock |

### Decisiones clave del schema

- Montos en `NUMERIC(14,2)`, nunca floats
- `price_usd` en productos = columna generada (`cost_usd * (1 + markup_pct/100)`)
- Cada venta/compra guarda snapshot de `exchange_rate` y `total_bs` al momento de la transacción
- IVA 16% almacenado por venta (para historial si cambia la tasa)
- Métodos de pago: efectivo_usd, efectivo_bs, transferencia, pago_movil, punto_venta, zelle, mixto

## API REST — `/api/v1`

Formato de respuesta estándar:
```
Éxito: { success: true, data: T, meta?: { page, limit, total } }
Error: { success: false, error: { code, message, details? } }
```

### Endpoints principales

- **Auth**: `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- **Users**: CRUD (admin only) + toggle activo/inactivo
- **Products**: CRUD + `GET /products/search?q=` + `GET /products/low-stock`
- **Categories/Brands/Vehicles**: CRUD auxiliar
- **Inventory**: `GET /inventory/movements`, `POST /inventory/adjustments`
- **Purchases**: `GET`, `POST` (con array de detalles, actualiza stock automáticamente)
- **Sales**: `GET`, `POST` (con detalles), `POST /:id/void` (anula y revierte stock)
- **Clients/Suppliers**: CRUD
- **Exchange Rates**: `GET /current`, `GET` (historial), `POST` (registrar tasa)
- **Reports**: ventas por período, por producto, por vendedor, valoración inventario, utilidad bruta

## Permisos por Rol

| Módulo | Admin | Vendedor | Almacén | Cajero |
|---|---|---|---|---|
| Productos | CRUD | Leer | CRUD | Leer |
| Ventas | Todo | Crear + ver propias | — | Crear + ver todas |
| Compras | Todo | — | Todo | — |
| Inventario | Todo | — | Todo | — |
| Clientes | CRUD | CRUD | — | Leer |
| Proveedores | CRUD | — | CRUD | — |
| Tasas de cambio | CRUD | Leer | Leer | Leer |
| Reportes | Todos | Ventas | Inventario | Caja |
| Usuarios | CRUD | — | — | — |

## Pantallas del Frontend

1. **Login**
2. **Dashboard** — ventas del día, tasa actual, alertas stock bajo, accesos rápidos
3. **Productos** — lista con filtros (categoría, marca, vehículo), detalle, formulario
4. **Nueva Venta** (pantalla tipo POS) — búsqueda rápida, carrito, precio dual USD/Bs, método de pago
5. **Lista de Ventas** — filtrable por fecha, vendedor, cliente
6. **Nueva Compra** — seleccionar proveedor, agregar productos, cantidades, costos
7. **Lista de Compras**
8. **Clientes / Proveedores** — CRUD con búsqueda
9. **Tasas de Cambio** — historial + registrar tasa del día
10. **Reportes** — ventas, inventario, utilidad con rango de fechas
11. **Gestión de Usuarios** (admin) — crear, editar, activar/desactivar

## Secuencia de Implementación

### Fase 1 — Fundación (días 1-3)
- Inicializar monorepo con npm workspaces y los 3 paquetes
- `@autopartes-air/shared`: types, validators Zod, utils de moneda
- `@autopartes-air/server`: Express app, Drizzle config, conexión DB
- Schema completo de Drizzle + migración inicial + seed
- Módulo de auth (login, JWT, refresh, middleware RBAC)

### Fase 2 — CRUD Core (días 4-7)
- Módulos: productos, categorías, marcas, vehículos, clientes, proveedores, tasas de cambio
- Setup web: Vite + React + Ant Design + React Router + React Query
- Login + rutas protegidas + páginas de productos

### Fase 3 — Transacciones (días 8-12)
- Módulos de compras y ventas (con actualización de stock y log de movimientos)
- Página de Nueva Venta (UI tipo POS — la más importante)
- Páginas de listas de ventas y compras
- Ajustes de inventario

### Fase 4 — Reportes y Pulido (días 13-16)
- Endpoints y páginas de reportes
- Dashboard
- Gestión de usuarios
- Alertas de stock bajo
- Layout de impresión de recibo (CSS `@media print`)

## Verificación

1. `npm run db:migrate && npm run db:seed` — crea tablas y datos iniciales
2. `npm run dev` — levanta server (puerto 3000) y web (puerto 5173)
3. Login con usuario admin del seed
4. Flujo completo: registrar tasa → crear producto → crear venta → verificar stock decrementado → ver reporte
5. Probar permisos: login con rol vendedor, verificar que no puede acceder a compras ni usuarios
