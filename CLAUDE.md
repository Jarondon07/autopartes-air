# CLAUDE.md

Guía para trabajar en este repositorio. Léela antes de hacer cambios.

## Qué es

**AutoparteAIR** — sistema de gestión de compra, venta e inventario de repuestos automotrices para Venezuela. Maneja precios en USD (canónico) y bolívares con tasa de cambio (BCV y otras 3 fuentes). Diseñado *API-first* para soportar múltiples clientes (web y escritorio).

El idioma del proyecto y de la comunicación es **español** (mensajes de UI, commits, comentarios).

## Estructura (monorepo npm workspaces)

```
apps/
├── shared/    @autopartes-air/shared  — tipos, validadores Zod, constantes, utils de moneda
├── server/    @autopartes-air/server  — API Express + Drizzle ORM
├── web/       @autopartes-air/web     — SPA React + Ant Design (cliente principal)
└── desktop/   (Python, NO es workspace npm) — cliente PySide6 que consume la misma API
```

`shared` es la pieza clave: los mismos schemas de Zod validan en el servidor y tipan los formularios del frontend. Cambios ahí afectan a ambos lados.

## Stack

- **Backend:** Node + Express + TypeScript, Drizzle ORM, PostgreSQL, Zod, JWT.
- **Web:** React + Vite + TypeScript + Ant Design + React Query (server state) + Zustand (auth/UI).
- **Desktop:** Python + PySide6 (Qt) + requests. Ver [apps/desktop/README.md](apps/desktop/README.md).
- **Worker de tasas:** job in-process en el server (no es un app aparte) que consulta la API de Radar **una vez al día a las `BCV_FETCH_TIME`** (default `00:30`, hora local) y actualiza las 4 tasas; además hay una actualización manual ("Actualizar ahora" → `POST /exchange-rates/refresh`). Ver [apps/server/src/modules/exchange-rates/bcv-worker.ts](apps/server/src/modules/exchange-rates/bcv-worker.ts).

## Cómo levantar

```bash
npm install            # raíz — instala y enlaza los 3 workspaces
npm run dev            # levanta API (4300) + web (4301) juntos
npm run dev:server     # solo API
npm run dev:web        # solo web
```

Base de datos (PostgreSQL local en 5432, DB `autopartes-air`):

```bash
npm run db:generate    # genera migración desde el schema
npm run db:migrate     # aplica migraciones
npm run db:seed        # datos iniciales
npm run typecheck      # tsc en todos los workspaces
```

Usuarios de prueba (seed): `admin`/`admin123`, `vendedor1`/`vendedor123`.

El **worker de tasas** solo arranca si `RADAR_API_KEY` está definida en `.env.local`; sin ella, el server funciona igual y las tasas se cargan manualmente.

## Puertos (rango asignado: 4300-4399)

| Puerto | Servicio |
|---|---|
| 4300 | API |
| 4301 | Web (Vite; hace proxy de `/api` → 4300) |
| 5432 | PostgreSQL (nativo, compartido) |

**Ambos servicios deben correr.** Si la web está arriba pero la API no, cualquier `/api` devuelve 500 (el proxy no encuentra destino). Para cambiar puertos, tocar de forma coordinada `apps/server/.env.local` (`PORT`, `CORS_ORIGIN`) y `apps/web/vite.config.ts` (`server.port`, proxy `target`).

## Entorno de desarrollo

El usuario trabaja en **Windows 10** con **PowerShell y Git Bash**. Da los comandos en la sintaxis correcta del shell:
- Activar venv Python: PowerShell `.venv\Scripts\Activate.ps1` · Git Bash `source .venv/Scripts/activate`.
- En Git Bash usar herramientas Unix (`head`, `grep`), no cmdlets de PowerShell.

## Convenciones

### Servidor (por módulo en `apps/server/src/modules/<nombre>/`)
- `router.ts` — rutas, permisos (`requirePermission`), validación (`validate(schema)`). Aplica `requireAuth` a nivel de router.
- `service.ts` — lógica de negocio y acceso a datos con Drizzle.
- Respuestas vía `lib/respond.ts`: `ok`, `created`, `paginated`.
- Errores de restricción de BD: `lib/db-errors.ts` (`withUniqueGuard`, `withForeignKeyGuard`). **Drizzle envuelve el error de `pg` en `err.cause`**, por eso el guard recorre la cadena de causas — sin eso, un UNIQUE devuelve 500 en vez de 409.
- Formato de respuesta: `{ success: true, data, meta? }` / `{ success: false, error: { code, message, details? } }`.
- **Movimientos de stock:** todo cambio de inventario pasa por `inventory/service.ts → applyStockChange(tx, ...)` (dentro de una transacción). Lo reusan compras (`+`, tipo `compra`), ventas (`-`, tipo `venta`), anulaciones (`+`, tipo `anulacion`) y ajustes manuales (`ajuste`). Guarda el movimiento auditable y rechaza stock negativo (400).
- **Transacciones:** dentro de `db.transaction`, usar SIEMPRE `tx` (no el `db` global — no ve las filas sin commitear). Patrón: la transacción devuelve el `id` y el `getById` (que usa `db` global) se llama DESPUÉS del commit. Compras/ventas siguen esto.

### Web (`apps/web/src/`)
- **Inputs numéricos (regla):** todo campo numérico usa los componentes de `components/NumberInputs.tsx`, nunca un `InputNumber`/`Input` crudo. Máscara es-VE tipo calculadora (dígitos entran por la derecha, miles con `.`, decimales con `,`, solo números): `MoneyInput` (montos, **2 decimales**), `RateInput` (tasas, **2 decimales**), `PercentInput` (porcentajes, 2 decimales, sufijo `%`), `QuantityInput` (**cantidades enteras**, sin decimales). Es solo presentación: la BD guarda montos y tasas `NUMERIC(x,2)` y cantidades `bigint`.
- `api/<modulo>.api.ts` — funciones Axios. `hooks/use<Modulo>.ts` — hooks de React Query.
- El cliente Axios (`api/client.ts`) hace refresh silencioso en 401 y reintenta.
- Navegación en `components/layout/nav.config.tsx` (árbol con submenús); las **rutas se generan solas** desde `NAV_LEAVES` en `App.tsx`. Cada hoja tiene `path` + `permission`; el menú y las rutas se filtran por permisos.
- `RequirePermission` acepta un permiso o un array (any-of).
- **Formularios grandes = pantalla completa, no modal.** El de producto vive en rutas propias (`/productos/nuevo`, `/productos/:id/editar` → `ProductFormPage`, registradas a mano en `App.tsx`), no en una modal. La lista de productos tiene miniatura, drawer de vista previa y activar/desactivar.
- **Validación visible en formularios largos:** al guardar con errores, además del rojo inline, mostrar (a) `message.error` toast, (b) `scrollToFirstError` / `form.scrollToField` al primer campo inválido, y (c) un `Alert` resumen arriba con la lista de campos faltantes (patrón en `ProductFormPage`). Requeridos del producto: nombre, ≥1 categoría, marca del repuesto, marca del carro, número de pieza, ≥1 modelo (validado también en `createProductSchema`).
- **Toasts (`message.*`) con fondo por tipo:** definido en `styles/global.css` con `:has(.ant-message-<tipo>)` (success/error/warning/info).

### Datos y dinero
- Montos y tasas en `NUMERIC(14,2)` (2 decimales). Nunca `float`. En TS llegan como **string**; convertir con `Number(...)` solo para mostrar/calcular en UI. El worker redondea las tasas de Radar a 2 decimales.
- `products.priceUsd` es **columna generada** por la BD = `ceil(cost_usd × (1 + markup_pct/100))` — se redondea **hacia arriba a dólar entero** (ej. 12,35 → 13,00). No se escribe a mano. La fórmula del front vive en `shared/utils/currency.ts → calcPriceUsd` (mismo `ceil`).
- **Modelo de precios:** el costo **NO** se ingresa en el form del producto; llega con la **compra** (el producto toma el **último costo** del lote y recalcula el precio). Precio de venta USD = `ceil(costo × (1 + margen/100))`. El **margen** por producto tiene default **30%**: se fija al **crear** el producto y también se puede **modificar al registrar una compra** (cada renglón lleva su `markupPct` y actualiza el del producto). Los 3 precios mostrados: USD (real, entero), Bs = `USD × USDT`, USD‑BCV = `Bs ÷ BCV`.
- **Impuestos (IVA):** configurables en `Configuración → Impuestos` (módulo `taxes`). El IVA (16%) ya no es constante fija: `taxes/service.ts → getAppliedRate()` suma las tasas **activas**. En el cajero el IVA es **opcional por venta** con un check **desactivado por defecto** (`applyIva`); solo si está activo se aplica **una vez** sobre el total (si no, `ivaPct = 0`). La venta guarda snapshot de tasa de cambio + totales USD/Bs.
- **SKU del producto:** se genera solo con `buildProductSku(abrevCategoría, abrevMarcaCarro, nºPieza)` (en `shared/utils/sku.ts`) → `[ABREV_CAT][ABREV_CARRO]-[nºpieza]` (ej. `EVAVW-905`). Por eso **categorías** y **marcas de carro** tienen columna `abbreviation`. No se escribe a mano.
- **Relaciones del producto (N:M):**
  - **Categorías múltiples** (`product_categories`, con `sortOrder`): la primera (`sortOrder` 0) es la **principal** — define el SKU y la columna de la lista. `products.categoryId` guarda la principal por conveniencia. El filtro por categoría de la lista usa la tabla puente (coincide en cualquier posición, no solo la principal).
  - **Modelos de carro con años por modelo** (`product_car_models` con `yearFrom`/`yearTo`): cada modelo compatible lleva su propio rango de años (no un rango global del producto).
  - **Almacén:** la ubicación es `products.warehouseId` → catálogo `warehouses` (módulo `warehouses`, `Configuración → Almacén`), **no** texto libre.
- **Imágenes de producto:** galería (máx. 10) con orden (`sortOrder`); la primera es la principal. Subida con `multer` (`POST /api/v1/uploads`, solo imagen, 3MB → `{url}`), edición con corte libre (`ImageCropModal`). Archivos en `uploads/` (gitignored), servidos en `/uploads`.
- **Tasas de cambio:** 4 fuentes (`bcv`, `euro`, `intervencion`, `usdt`), a **2 decimales**. El worker las trae de Radar **una vez al día a `BCV_FETCH_TIME`** (default `00:30`) + una consulta al arrancar; automáticas = `createdBy null`, manuales = id del usuario. Botón **"Actualizar ahora"** en `Configuración → Tasas` (`POST /exchange-rates/refresh`, permiso `RATES_CREATE`) para forzar la consulta. Fallback `BCV_FALLBACK_RATE` si no hay ninguna.
- **Cajero (`/ventas/caja`):** buscador único tipo Google (por nombre, código, nº de pieza, **marca del carro**, **modelo** y marca del repuesto) que muestra foto, stock (dónde/almacén) y los 3 precios antes de agregar. **No se puede vender más que el stock** (tope en agregar/cantidad + el servidor rechaza stock negativo); productos **sin stock no se agregan**. El **precio unitario NO se edita** en el cajero. Al **Cobrar** hay modal de confirmación ("¿Cobraste la venta?").
- **Métodos de pago:** una venta admite **varios** (`sales.paymentMethods` = `text[]`, mínimo 1). Valores en `shared/constants/enums.ts → PAYMENT_METHODS` (incluye `binance_usdt`; se eliminó `mixto`, ya innecesario al poder elegir varios). Se dejó de usar el `pgEnum` `payment_method`. Agrupados por moneda en `PAYMENT_METHOD_CURRENCY` / `PAYMENT_METHODS_BY_CURRENCY` (USD: efectivo_usd, zelle, binance_usdt · Bs: efectivo_bs, transferencia, pago_movil, punto_venta).
- **Pago mixto (desglose por método):** cada venta guarda cuánto se pagó con cada método en la tabla **`sale_payments`** (`method`, `amountUsd`, `amountBs`). El total de referencia es en **USD**; la parte USD vale su monto, la parte en **Bs** se cobra `USD × USDT` (y se registra su USD-BCV). En el cajero, al elegir 2+ métodos se ingresa el monto USD de cada uno y **el último se calcula solo** (resto). El servidor valida que `sum(amountUsd) == totalUsd` (400 si no cuadra). El precio de los ítems es siempre el USD de venta; la conversión a Bs ocurre a nivel de pago.
- Borrado de productos = **baja lógica** (`isActive=false`); categorías tienen `isActive` (activar/desactivar). Ventas se **anulan** (no se borran).
- Las migraciones (`apps/server/src/db/migrations/`) **se commitean**.

### Auth / RBAC
- JWT: access 15 min (header `Authorization: Bearer`) + refresh 7 días (cookie httpOnly en `/api/v1/auth`).
- Permisos definidos en `shared/src/constants/roles.ts`. La autoridad real es el middleware del servidor; el frontend solo oculta UI.

## Estado del desarrollo

- **Fase 1** ✅ Monorepo, schema, migraciones, seed, auth JWT + RBAC.
- **Fase 2** ✅ CRUD backend + web completo: Productos, Categorías (con activar/desactivar), Clientes, Proveedores, Tasas (4 fuentes + worker BCV). Shell del layout (sidebar con menú anidado, topbar con perfil, footer). Perfil propio (`/perfil`, editar nombre + cambiar contraseña).
- **Fase 3** ✅ (web) Inventario (movimientos + ajustes), Compras/Lotes, Ventas + **Cajero/POS** (`/ventas/caja`) + factura + anular.
- **Configuración** ✅ (web) Usuarios, Roles y permisos (roles **dinámicos** + superusuario **ROOT** oculto), Categorías (con `abbreviation`), Marcas de vehículos + modelos (con logo y corte libre), Impuestos (IVA configurable), Almacén (catálogo de ubicaciones).
- **Fase 4** ⏳ Reportes, dashboard real, impresión de recibos. Pendiente también **Deudas** (`/ventas/deudas`, hoy toda venta es de contado).

**RBAC — ROOT:** rol nº 1 `ROOT` + usuario inicial `root` = superusuario oculto (list/get/update/delete devuelven 404 para no-root; solo root asigna el rol root; el rol root es ineditable). `admin` sí es visible y puede tener todos los permisos. Los roles son dinámicos (se crean/editan permisos desde la UI).

**Módulos del server:** auth, users, roles, products, categories, brands, car-brands, car-models, vehicles, clients, suppliers, exchange-rates, inventory, purchases, sales, taxes, warehouses, uploads.

El menú de la web tiene la estructura completa. Rutas no implementadas enlazan a `PlaceholderPage`.

**Regla clave:** cada módulo nuevo de UI hay que construirlo en **ambos** frontends (React web y PySide6 desktop). La lógica no se duplica (vive en la API), pero las pantallas sí. El **desktop solo tiene Productos** hasta ahora; el resto de Fase 2/3 falta replicarlo allá.

## Gotchas

- `npm run db:migrate` a veces falla en Windows con exit 1 sin mensaje (bug de drizzle-kit). Alternativa usada en este repo: aplicar las migraciones con un script inline del migrador de `drizzle-orm` (`drizzle-orm/node-postgres/migrator`) o `psql -d autopartes-air -f <migracion>.sql`.
- `npm run db:generate` **falla si en la MISMA tabla se elimina una columna y se agrega otra** a la vez: drizzle-kit abre un prompt interactivo (rename vs create) y sin TTY (shell no interactivo) revienta. Truco: hacerlo en **dos migraciones** — primero solo el ADD (deja la vieja), genera; luego quita la vieja, genera el DROP. (Así se hizo `location` → `warehouseId`.)
- **Nunca uses el `db` global dentro de una `db.transaction`**: no ve las filas sin commitear (da 404 y hace rollback). Devuelve el id desde la tx y llama `getById` después. (Este bug apareció en compras y ventas.)
- Ant Design 5.24+: usar `popupRender` en `Dropdown` (no `dropdownRender`) y `destroyOnHidden` en `Modal` (no `destroyOnClose`) — ambos deprecados.
- La API de Radar devuelve `{ rates: [...] }` (no un array plano) y `midRate` como **string** — el worker lo parsea así.
- `.env` y `.env.local` están en `.gitignore` (contienen secretos, incl. `RADAR_API_KEY`). Al clonar, copiar de `.env.example`.
- Las imágenes subidas viven en `apps/server/uploads/` (gitignored) y se sirven en `/uploads`; Vite hace proxy de `/uploads` → 4300 igual que `/api`. En dev deben correr ambos servicios para ver las miniaturas.
- Vite corre con `server.host: true` (en `vite.config.ts`) para poder abrir la web desde otros equipos de la LAN (`http://<ip>:4301`). Si no carga desde otro dispositivo, suele ser el **Firewall de Windows** bloqueando el 4301 (permitir en redes privadas). El proxy sigue apuntando a `localhost:4300` (la API no se expone a la red).
- Nombre visible del sistema = "AutoparteAIR" (aunque el paquete npm es `autopartes-air`).
- Los procesos `npm run dev:server` en background pueden dejar el puerto 4300 ocupado; si un arranque no imprime "escuchando", revisar/matar lo que esté en 4300.
