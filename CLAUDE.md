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

Usuarios de prueba (seed): `root`/`Clave123*` (superusuario) y `admin`/`Clave123*`. El seed **solo crea usuarios que no existan** (no pisa contraseñas de usuarios ya presentes): para aplicar una contraseña nueva sobre una BD existente, borrar el usuario antes (`DELETE FROM users WHERE username IN ('root','admin')`) y re-sembrar.

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
- **Fechas y horas (regla):** nunca formatear con `dayjs(...).format(...)` en las pantallas; usar `lib/datetime.ts` (`formatDate`, `formatDateTime`, `formatShortDateTime`, `formatTime`). La hora se muestra en **12 h con `a.m.`/`p.m.`** (ej. `19/08/2026 02:45 p.m.`), que es como se lee en Venezuela; `dayjs` con `A`/`a` daría "AM"/"am", por eso el sufijo se arma a mano.
- **Inputs numéricos (regla):** todo campo numérico usa los componentes de `components/NumberInputs.tsx`, nunca un `InputNumber`/`Input` crudo. Máscara es-VE tipo calculadora (dígitos entran por la derecha, miles con `.`, decimales con `,`, solo números): `MoneyInput` (montos, **2 decimales**), `RateInput` (tasas, **2 decimales**), `PercentInput` (porcentajes, 2 decimales, sufijo `%`), `QuantityInput` (**cantidades enteras**, sin decimales). Es solo presentación: la BD guarda montos y tasas `NUMERIC(x,2)` y cantidades `bigint`.
- `api/<modulo>.api.ts` — funciones Axios. `hooks/use<Modulo>.ts` — hooks de React Query.
- El cliente Axios (`api/client.ts`) hace refresh silencioso en 401 y reintenta.
- Navegación en `components/layout/nav.config.tsx` (árbol con submenús); las **rutas se generan solas** desde `NAV_LEAVES` en `App.tsx`. Cada hoja tiene `path` + `permission`; el menú y las rutas se filtran por permisos.
- `RequirePermission` acepta un permiso o un array (any-of).
- **Formularios grandes = pantalla completa, no modal.** El de producto vive en rutas propias (`/productos/nuevo`, `/productos/:id/editar` → `ProductFormPage`, registradas a mano en `App.tsx`), no en una modal. La lista de productos tiene miniatura, drawer de vista previa y activar/desactivar.
- **Validación visible en formularios largos:** al guardar con errores, además del rojo inline, mostrar (a) `message.error` toast, (b) `scrollToFirstError` / `form.scrollToField` al primer campo inválido, y (c) un `Alert` resumen arriba con la lista de campos faltantes (patrón en `ProductFormPage`). Requeridos del producto: nombre, ≥1 categoría, marca del repuesto, marca del carro, número de pieza, ≥1 modelo (validado también en `createProductSchema`).
- **Responsive (regla):** la web se usa mucho desde el teléfono. El corte es **768px** (`md`), vía `hooks/useResponsive.ts` (`useIsMobile()`). En móvil: el sidebar es un **Drawer** (no se colapsa a iconos), la topbar deja solo el avatar, y los modales/drawers ocupan casi toda la pantalla (reglas en `styles/global.css`). **Todo listado nuevo usa `components/DataTable.tsx`**, no `<Table>` crudo: acepta las mismas props del `Table` de AntD más `mobileCard`, que en teléfono convierte cada fila en una tarjeta (título, subtítulo, tags, pares dato/valor y acciones). Sin `mobileCard` cae a la tabla con `scroll={{ x: 'max-content' }}`. Las tablas de detalle (factura, renglones de compra, reportes) sí siguen siendo tablas, pero con scroll horizontal.
- **Toasts (`message.*`) con fondo por tipo:** definido en `styles/global.css` con `:has(.ant-message-<tipo>)` (success/error/warning/info).

### Datos y dinero
- Montos y tasas en `NUMERIC(14,2)` (2 decimales). Nunca `float`. En TS llegan como **string**; convertir con `Number(...)` solo para mostrar/calcular en UI. El worker redondea las tasas de Radar a 2 decimales.
- `products.priceUsd` es **columna generada** por la BD = `ceil(cost_usd × (1 + markup_pct/100))` — se redondea **hacia arriba a dólar entero** (ej. 12,35 → 13,00). No se escribe a mano. La fórmula del front vive en `shared/utils/currency.ts → calcPriceUsd` (mismo `ceil`).
- **Modelo de precios:** el costo **NO** se ingresa en el form del producto; llega con la **compra** (el producto toma el **último costo** del lote y recalcula el precio). Precio de venta USD = `ceil(costo × (1 + margen/100))`. El **margen** por producto tiene default **30%**: se fija al **crear** el producto y también se puede **modificar al registrar una compra** (cada renglón lleva su `markupPct` y actualiza el del producto). Los 3 precios mostrados: USD (real, entero), Bs = `USD × USDT`, USD‑BCV = `Bs ÷ BCV`.
- **Impuestos (IVA):** configurables en `Configuración → Impuestos` (módulo `taxes`). El IVA (16%) ya no es constante fija: `taxes/service.ts → getAppliedRate()` suma las tasas **activas**. En el cajero el IVA es **opcional por venta** con un check **desactivado por defecto** (`applyIva`); solo si está activo se aplica **una vez** sobre el total (si no, `ivaPct = 0`). La venta guarda snapshot de tasa de cambio + totales USD/Bs.
- **Cambiar el precio de venta:** `products.priceUsd` es columna generada, así que **lo único que se guarda es el margen**. En pantalla se editan los dos y cada uno recalcula al otro (nadie piensa "súbele 12,68 %", piensa "ahora vale 80"): `shared/utils/currency.ts → calcMarkupPct(costo, precio)` despeja el margen y **corrige el redondeo de a 0,01 %**, porque el `ceil` a dólar entero puede dejar el precio un dólar corto. Está en el form de producto (junto al costo, en solo lectura) y en el **modal rápido de la lista** (`PriceEditModal`): el precio USD de cada fila es un botón, para no entrar a la ficha por un número que cambia cada semana. Sin costo (producto sin compras) no hay precio que calcular y el campo se deshabilita.
- **SKU del producto:** se genera solo con `buildProductSku(abrevCategoría, abrevMarcaCarro, nºPieza)` (en `shared/utils/sku.ts`) → `[ABREV_CAT][ABREV_CARRO]-[nºpieza]` (ej. `EVAVW-905`). Por eso **categorías** y **marcas de carro** tienen columna `abbreviation`. No se escribe a mano.
- **Productos universales** (`products.isUniversal`): los que sirven para cualquier vehículo (gas refrigerante, aceites, limpiadores). En el form, el select de marca de carro trae la opción **"Todas las marcas (universal)"** (centinela de UI `-1`, no una marca falsa en el catálogo); al elegirla, marca y modelos dejan de ser obligatorios y el servidor los pone en `null`/vacío. El SKU usa `UNIVERSAL_CAR_ABBR` (`UNIV`) en lugar de la marca → `REFUNIV-134a`. En la **búsqueda** (`products/service.ts → list()`) un universal responde a una palabra **solo si esa palabra es una marca o un modelo que existe** (subconsulta `EXISTS`): así "toyota" lo ofrece pero "evaporador" no lo arrastra.
- **Relaciones del producto (N:M):**
  - **Categorías múltiples** (`product_categories`, con `sortOrder`): la primera (`sortOrder` 0) es la **principal** — define el SKU y la columna de la lista. `products.categoryId` guarda la principal por conveniencia. El filtro por categoría de la lista usa la tabla puente (coincide en cualquier posición, no solo la principal).
  - **Modelos de carro con años por modelo** (`product_car_models` con `yearFrom`/`yearTo`): cada modelo compatible lleva su propio rango de años (no un rango global del producto).
  - **Almacén:** la ubicación es `products.warehouseId` → catálogo `warehouses` (módulo `warehouses`, `Configuración → Almacén`), **no** texto libre.
- **Imágenes de producto:** galería (máx. 10) con orden (`sortOrder`); la primera es la principal. Subida con `multer` (`POST /api/v1/uploads`, solo imagen, 3MB → `{url}`), edición con corte libre (`ImageCropModal`). Archivos en `uploads/` (gitignored), servidos en `/uploads`.
- **Las imágenes se preparan en el navegador** (`web/src/lib/image.ts`): el recorte se exporta en **WebP** (calidad 0,8, ~30 % más liviano que JPEG) con reserva automática a JPEG, con el lado mayor acotado a **1400 px** (fotos) o **400 px** (logos de marca); la imagen origen se reduce a 2400 px antes de mostrarla en el recortador. Antes se exportaba **PNG a resolución completa**: el recorte de una foto de teléfono pesaba más que el original y Nginx lo rechazaba con **413** (`client_max_body_size 5M`). Dos trampas: (a) `canvas.toBlob` con un tipo no soportado **cae a PNG en silencio**, por eso se comprueba `blob.type` y la extensión del archivo se deriva de ahí; (b) al reencodar hay que pintar **fondo blanco** primero, porque un PNG transparente saldría con fondo negro.
- **Tasas de cambio:** 4 fuentes (`bcv`, `euro`, `intervencion`, `usdt`), a **2 decimales**. El worker las trae de Radar **una vez al día a `BCV_FETCH_TIME`** (default `00:30`) + una consulta al arrancar; automáticas = `createdBy null`, manuales = id del usuario. Botón **"Actualizar ahora"** en `Configuración → Tasas` (`POST /exchange-rates/refresh`, permiso `RATES_CREATE`) para forzar la consulta. Fallback `BCV_FALLBACK_RATE` si no hay ninguna.
- **Cajero (`/ventas/caja`):** buscador **multi-palabra** tipo Google — cada palabra debe coincidir en ALGÚN campo (nombre, código, nº de pieza, **marca del carro**, **modelo**, marca del repuesto) y todas deben cumplirse (AND entre palabras, OR entre campos); así "evaporador toyota" o "toyota yaris" encuentran combinando campos (lógica en `products/service.ts → list()`, aplica también a la lista de Productos). Los resultados muestran foto, stock (dónde/almacén) y los 3 precios antes de agregar. **No se puede vender más que el stock**; productos **sin stock no se agregan**; el **precio unitario solo se edita con autorización por PIN** (ver abajo). Clic en el nombre del ítem del carrito abre la **ficha del producto** (galería + datos + 3 precios) en modal (`components/ProductPreview.tsx`). Para **Cobrar** se requiere: producto(s), **cliente** y método(s) de pago; hay modal de confirmación ("¿Cobraste la venta?") y, al registrar, se muestra la **factura completa** (`components/SaleInvoice.tsx`) con botón "Volver al cajero".
- **Cliente en el cajero:** `ClientPicker` (bajo el carrito) busca por **tipo de documento + cédula/RIF**; si no existe, abre el `ClientFormModal` completo precargado y lo carga en la caja. El **cliente es requerido** para cobrar. En `ClientFormModal` el **teléfono** es combo de código de área (`0414/0424/0416/0426/0412/0422`) + 7 dígitos (se guarda `0414-1234567`); **teléfono y dirección** ("Dirección corta") son requeridos en el form.
- **Métodos de pago:** una venta admite **varios** (`sales.paymentMethods` = `text[]`, mínimo 1). Valores en `shared/constants/enums.ts → PAYMENT_METHODS` (incluye `binance_usdt`; se eliminó `mixto`, ya innecesario al poder elegir varios). Se dejó de usar el `pgEnum` `payment_method`. Agrupados por moneda en `PAYMENT_METHOD_CURRENCY` / `PAYMENT_METHODS_BY_CURRENCY` (USD: efectivo_usd, zelle, binance_usdt · Bs: efectivo_bs, transferencia, pago_movil, punto_venta).
- **Pago mixto (desglose por método):** cada venta guarda cuánto se pagó con cada método en la tabla **`sale_payments`** (`method`, `amountUsd`, `amountBs`). El total de referencia es en **USD**; la parte USD vale su monto, la parte en **Bs** se cobra `USD × USDT` (y se registra su USD-BCV). En el cajero, al elegir 2+ métodos se ingresa el monto USD de cada uno y **el último se calcula solo** (resto). El servidor valida que `sum(amountUsd) == totalUsd` (400 si no cuadra). El precio de los ítems es siempre el USD de venta; la conversión a Bs ocurre a nivel de pago.
- **Deudas / ventas a crédito (`/ventas/deudas`, módulo `debts`):** una venta con `sales.isCredit` sale con la mercancía y el pago pendiente; `sales.dueDate` (columna `date`, sin hora, para que la fecha no se corra por zona horaria) es el día acordado de pago. **No hay tabla de abonos**: un abono es una fila más de `sale_payments`, que ganó `paidAt`, `exchangeRate`, `userId` y `notes`. Por eso el **saldo no se guarda, se calcula** (`totalUsd - SUM(amountUsd)`) y el **estado también es derivado** (`pagada` / `vencida` / `parcial` / `pendiente`), no una columna: "vencida" cambia sola con el paso del tiempo. En `create` la validación se bifurca — de contado el desglose debe cuadrar exacto (como siempre); a crédito el pago es un **abono inicial opcional** y solo se rechaza si supera el total. Un crédito exige **cliente y fecha**. `POST /debts/:id/payments` relee el saldo **dentro de la transacción** (entre que la pantalla lo mostró y el cajero confirmó, otro pudo haber abonado) y rechaza el abono que lo exceda; los métodos en Bs se convierten con la tasa **USDT** del día y esa tasa se guarda en la fila. **Anular una venta a crédito con abonos devuelve 409**: el dinero ya entró y revertirlo descuadra la caja. Permisos propios: `DEBTS_READ` y `DEBTS_PAY`.
- **Dashboard (`/`) y Reportes (`/reportes`):** agregados **en SQL** (no traer filas y sumar en JS). Dashboard usa `GET /sales/summary` (count + sum USD/Bs, respeta permisos) y `GET /products/low-stock`. Módulo `reports` (`/api/v1/reports`): `sales/daily`, `sales/top-products` (perm `REPORTS_SALES`), `sales/by-payment` (cuadre de caja, `REPORTS_CASH`), `inventory/summary` (valorización a costo/venta, `REPORTS_INVENTORY`); todos aceptan `REPORTS_ALL`. La página Reportes filtra por rango y **muestra/consulta cada sección según el permiso** del usuario (hooks con `enabled`, sin llamadas 403). v1 sin librería de gráficos (tablas + `Progress`).
- **Cambio de precio en el cajero (autorizado por PIN):** el precio unitario nace bloqueado. El candado del renglón abre un modal que pide **usuario + PIN** de alguien con el permiso `sales:override_price` (`POST /sales/price-authorization`); el servidor devuelve un **token de 5 minutos** (scope `price_override`, ver `sales/price-auth.ts`) que el cajero adjunta a la venta en `priceAuthToken`. El supervisor **no inicia sesión**: la caja sigue siendo del cajero. El precio se puede **subir o bajar**, pero **nunca por debajo del `costUsd`** del producto (lo rechaza el servidor, que es quien tiene el costo). Cada renglón cambiado guarda `sale_details.original_price_usd` y `authorized_by`, y la factura muestra el precio tachado + quién autorizó. Antes de esto el servidor **aceptaba cualquier `unitPriceUsd`** que le mandaran: la regla "el precio no se edita" solo vivía en la pantalla.
- **PIN de autorización (`users.security_pin`, hash bcrypt):** lo fija **cada usuario** en `/perfil` (pidiendo su contraseña), nunca un administrador — un PIN que otro conoce no avala nada. Son 4 a 6 dígitos. `AuthUser.hasSecurityPin` dice si ya lo tiene; el hash no sale del servidor. La ruta que lo verifica está limitada a **5 intentos fallidos por usuario cada 15 min** (`lib/rate-limit.ts`, en memoria): un PIN de 4 dígitos son 10.000 combinaciones.
- **Catálogo público (`/catalogo`, módulo `catalog`):** la **única** pantalla sin sesión, y `/api/v1/public/*` las **únicas** rutas sin `requireAuth`. Es la portada: quien entra a `/` sin sesión cae ahí (lo decide `ProtectedRoute`), y desde ahí se va al login. Tiene el mismo buscador multi-palabra (se extrajo `products/service.ts → searchConditions()` para no duplicarlo), filtros por categoría y marca, y **descarga en PDF** (jsPDF + autotable, cargado con `import()` dinámico porque pesa ~400 KB). **No reutiliza el listado interno a propósito**: aquel devuelve costo, margen, stock exacto y almacén. El DTO público lleva solo lo publicable y la disponibilidad es **"Disponible/Agotado"**, no la cantidad. Las rutas públicas llevan límite por IP (120/min) y caché de 60 s, porque son las únicas expuestas a internet sin autenticar.
- **El stock NO se fija al crear el producto:** nace en 0 y entra por **compras** o por un **ajuste** de Inventario, para que cada unidad tenga su movimiento auditable. El campo se quitó del formulario y `createProductSchema` ya no acepta `stock` (Zod descarta la clave, así que mandarlo por API tampoco funciona).
- Borrado de productos = **baja lógica** (`isActive=false`); categorías tienen `isActive` (activar/desactivar). Ventas se **anulan** (no se borran).
- Las migraciones (`apps/server/src/db/migrations/`) **se commitean**.

### Auth / RBAC
- JWT: access 15 min (header `Authorization: Bearer`) + refresh 7 días (cookie httpOnly en `/api/v1/auth`), salvo sin "Recordarme": ahí la cookie es de sesión y muere al cerrar el navegador.
- **"Recordarme" del login:** son dos cosas. (a) La **duración de la sesión**: con la casilla marcada la cookie de refresh dura 7 días; sin ella se emite como **cookie de sesión** (sin `maxAge`) y el navegador la borra al cerrarse — lo correcto en la caja, que es un equipo compartido. El flag viaja **dentro del refresh token** porque en `/auth/refresh` la cookie llega sin sus atributos: sin eso, una sesión de navegador se volvería persistente en la primera renovación. (b) Las **credenciales recordadas** en `localStorage` del navegador (`autopartes:remembered-user` y `autopartes:remembered-pass`), para que el formulario llegue listo para entrar. **La contraseña queda en texto plano** — decisión explícita del dueño del sistema, tomada sabiendo que cualquiera con acceso a ese equipo puede leerla desde las herramientas del navegador. Solo se guardan con la casilla marcada, y desmarcarla las borra. Antes la casilla no hacía absolutamente nada y la cookie duraba 7 días siempre.
- **Cambio obligatorio de contraseña:** `users.mustChangePassword` se enciende al **crear** un usuario y al **resetearle** la contraseña desde Configuración (la que fija el administrador es provisional), y se apaga cuando el propio usuario la cambia. El flag viaja **dentro del access token**: `requireAuth` responde **403 `PASSWORD_CHANGE_REQUIRED`** en toda ruta protegida mientras esté encendido; solo `GET /auth/me` y `POST /auth/change-password` usan `requireAuthAllowPasswordChange`. Por eso `change-password` devuelve **sesión nueva** (token + cookie): con el token viejo el usuario seguiría bloqueado hasta 15 min. En la web lo aplica `ProtectedRoute`, que renderiza `ForcePasswordChangePage` en lugar del layout sin cambiar la URL. El seed marca `root` y `admin` así (su clave está publicada en este archivo).
- Permisos definidos en `shared/src/constants/roles.ts`. La autoridad real es el middleware del servidor; el frontend solo oculta UI.

## Estado del desarrollo

- **Fase 1** ✅ Monorepo, schema, migraciones, seed, auth JWT + RBAC.
- **Fase 2** ✅ CRUD backend + web completo: Productos, Categorías (con activar/desactivar), Clientes, Proveedores, Tasas (4 fuentes + worker BCV). Shell del layout (sidebar con menú anidado, topbar con perfil, footer). Perfil propio (`/perfil`, editar nombre + cambiar contraseña).
- **Fase 3** ✅ (web) Inventario (movimientos + ajustes), Compras/Lotes, Ventas + **Cajero/POS** (`/ventas/caja`) + factura + anular.
- **Configuración** ✅ (web) Usuarios, Roles y permisos (roles **dinámicos** + superusuario **ROOT** oculto), Categorías (con `abbreviation`), Marcas de vehículos + modelos (con logo y corte libre), Impuestos (IVA configurable), Almacén (catálogo de ubicaciones).
- **Fase 4** ⏳ Dashboard real ✅, Reportes ✅ (v1: ventas por día, top productos, cuadre por método, inventario valorizado — sin gráficos aún) y **Deudas** ✅ (ventas a crédito con fecha de pago, abono inicial, abonos y estados derivados). Pendiente: **gráficos** e **impresión de recibos**.
- **Extras (sep. 2026)** ✅ **Catálogo público** (`/catalogo`, portada sin sesión, con PDF), **cambio de precio en el cajero con PIN** (`sales:override_price`, auditado por renglón), **re-precificar productos** desde la ficha y desde la lista (precio ↔ margen vinculados) y **"Recordarme"** del login, que hasta ahora no hacía nada.

**RBAC — ROOT:** rol nº 1 `ROOT` + usuario inicial `root` = superusuario oculto (list/get/update/delete devuelven 404 para no-root; solo root asigna el rol root; el rol root es ineditable). `admin` sí es visible y puede tener todos los permisos. Los roles son dinámicos (se crean/editan permisos desde la UI).

**Módulos del server:** auth, users, roles, products, categories, brands, car-brands, car-models, vehicles, clients, suppliers, exchange-rates, inventory, purchases, sales, debts, taxes, warehouses, uploads, reports, catalog (público).

El menú de la web tiene la estructura completa. Rutas no implementadas enlazan a `PlaceholderPage`.

**Regla clave:** cada módulo nuevo de UI hay que construirlo en **ambos** frontends (React web y PySide6 desktop). La lógica no se duplica (vive en la API), pero las pantallas sí. El **desktop solo tiene Productos** hasta ahora; el resto de Fase 2/3 falta replicarlo allá.

## Gotchas

- `drizzle-kit migrate` sale con **exit 1 sin imprimir nada** cuando algo falla (credenciales, permisos), en Windows y en el VPS. Por eso las migraciones **no** se aplican con él: usar `npm run db:migrate:local` (desarrollo) o `npm run db:migrate:prod` (producción), que invocan `deploy/migrate.mjs` — el migrador de `drizzle-orm` directo, que sí reporta la causa. Elige `.env` o `.env.local` según `NODE_ENV`, igual que `infra/env.ts`, y **debe correrse con cwd en `apps/server`** (rutas relativas); `node_modules` se resuelve por la ubicación del archivo, por eso el script vive dentro del repo y no en `/tmp`.
- `npm run db:generate` **falla si en la MISMA tabla se elimina una columna y se agrega otra** a la vez: drizzle-kit abre un prompt interactivo (rename vs create) y sin TTY (shell no interactivo) revienta. Truco: hacerlo en **dos migraciones** — primero solo el ADD (deja la vieja), genera; luego quita la vieja, genera el DROP. (Así se hizo `location` → `warehouseId`.)
- **Reglas de `.gitignore` sin anclar se comen código fuente.** La regla `uploads/` ignoraba *cualquier* carpeta con ese nombre, incluida `apps/server/src/modules/uploads/` — el módulo nunca se commiteó y el primer clon limpio (el VPS) reventó con `ERR_MODULE_NOT_FOUND`. Hoy es `/apps/server/uploads/`. Al agregar una regla para una carpeta de runtime, **anclarla con `/`**; y ante un `ERR_MODULE_NOT_FOUND` de un archivo que sí existe en tu disco, comprobar `git check-ignore -v <ruta>`.
- **Nunca uses el `db` global dentro de una `db.transaction`**: no ve las filas sin commitear (da 404 y hace rollback). Devuelve el id desde la tx y llama `getById` después. (Este bug apareció en compras y ventas.)
- **Un campo con máscara cuyo valor se deriva de otro se traba al editarlo.** `AmountInput` (`NumberInputs.tsx`) es totalmente controlado: pinta lo que el padre le devuelve. Si el valor mostrado es calculado y el cálculo tiene un piso, el campo **rebota** y no deja escribir — pasó con el precio de venta, que sale del margen: al borrar dígitos el valor caía bajo el costo, el margen se limitaba a 0 y el campo volvía al costo en cada tecla. La solución es un **borrador local** mientras se teclea (`priceDraft`), y normalizar en `onBlur`. Vale para cualquier par de campos vinculados que se agregue después.
- Ant Design 5.24+: usar `popupRender` en `Dropdown` (no `dropdownRender`) y `destroyOnHidden` en `Modal` (no `destroyOnClose`) — ambos deprecados.
- La API de Radar devuelve `{ rates: [...] }` (no un array plano) y `midRate` como **string** — el worker lo parsea así.
- `.env` y `.env.local` están en `.gitignore` (contienen secretos, incl. `RADAR_API_KEY`). Al clonar, copiar de `.env.example`.
- Las imágenes subidas viven en `apps/server/uploads/` (gitignored) y se sirven en `/uploads`; Vite hace proxy de `/uploads` → 4300 igual que `/api`. En dev deben correr ambos servicios para ver las miniaturas.
- Vite corre con `server.host: true` (en `vite.config.ts`) para poder abrir la web desde otros equipos de la LAN (`http://<ip>:4301`). Si no carga desde otro dispositivo, suele ser el **Firewall de Windows** bloqueando el 4301 (permitir en redes privadas). El proxy sigue apuntando a `localhost:4300` (la API no se expone a la red).
- Nombre visible del sistema = "AutoparteAIR" (aunque el paquete npm es `autopartes-air`).
- Los procesos `npm run dev:server` en background pueden dejar el puerto 4300 ocupado; si un arranque no imprime "escuchando", revisar/matar lo que esté en 4300.

## Despliegue en producción (VPS)

Guía completa y archivos de infraestructura en [deploy/README.md](deploy/README.md).

- **Stack:** VPS Debian 13 con Node 22 + PostgreSQL + Nginx **nativos** (sin Docker). La API corre como servicio systemd (`deploy/autopartes-api.service`) en `127.0.0.1:4300`; Nginx (`deploy/nginx-autopartes-air.conf`) sirve `apps/web/dist`, hace proxy de `/api` y sirve `/uploads` como estático.
- **Un solo origen:** la web usa baseURL relativa (`/api/v1`, `/uploads`), así que no hay CORS entre dominios ni variables `VITE_*`. Nada que configurar en el front al desplegar.
- **`apps/desktop` no se despliega:** el clon en el VPS usa `git sparse-checkout set --no-cone '/*' '!/apps/desktop'`, y los `git pull` siguen excluyéndolo.
- **`npm ci` completo (con devDependencies):** el server no se compila, corre TypeScript con `tsx` en runtime (`npm start`), y la web necesita `vite` para el build. Nunca usar `--omit=dev`.
- **`COOKIE_SECURE`** (nueva env, opcional): controla el `secure` de la cookie del refresh token; si no se define sigue a `NODE_ENV`. Debe ser `false` mientras el sitio se sirva por **HTTP** (acceso por IP, sin dominio) — con `secure: true` sobre HTTP el navegador descarta la cookie y la sesión se corta a los 15 min. Poner `true` al montar HTTPS con certbot.
- **`WorkingDirectory` del servicio = `apps/server`**: `infra/env.ts` carga `.env` y `lib/upload.ts` resuelve `uploads/` **relativos al cwd**.
- **Actualizar:** `bash deploy/deploy.sh` (pull → `npm ci` → migraciones → build web → restart). **Respaldo:** `deploy/backup.sh` por cron (BD + `uploads/`, que no está en git).
- **Orden obligatorio al desplegar:** las **migraciones van antes del `systemctl restart`**. El código nuevo consulta columnas que aún no existen; al revés, la API arranca y falla en cada consulta.
- **Un módulo con permisos nuevos necesita `db:seed:prod`, no solo la migración.** Los permisos viven en filas (`permissions` + `role_permissions`): mientras no se siembren, el módulo existe pero **nadie lo ve**, ni siquiera `admin`. Pasó con `debts:read`/`debts:pay`. El seed es idempotente (solo agrega lo que falta, no pisa usuarios ni contraseñas), así que correrlo en cada despliegue que toque `shared/constants/roles.ts` es seguro:
  ```bash
  npm run db:migrate:prod -w @autopartes-air/server   # esquema
  npm run db:seed:prod    -w @autopartes-air/server   # permisos nuevos
  ```
- **Los permisos viajan dentro del access token**: tras sembrar permisos nuevos, una sesión ya abierta sigue con los viejos hasta que el token se renueve. Si el menú no muestra el módulo, **cerrar sesión y volver a entrar** (y `Ctrl+F5` si además cambió el bundle). Y si el usuario tiene un rol propio (no `admin`/`cajero`), el seed no se los asigna: hay que dárselos en `Configuración → Roles`.
- **La web es un build, no código interpretado:** el server corre TypeScript con `tsx` y toma los cambios con el restart, pero las pantallas nuevas no aparecen hasta correr `npm run build -w @autopartes-air/web`. Un despliegue de solo `git pull` + restart deja la API nueva sirviendo la web vieja.
- **No borres archivos antes de `git pull`.** El paso es `git pull --ff-only` a secas. Si git se queja de un archivo local, mirar `git status` y decidir: borrar a ciegas un archivo **rastreado** (le pasó a `uploads/router.ts`) no lo restaura el pull — git lo lee como un borrado tuyo pendiente — y deja la API sin arrancar. Se recupera con `git restore <ruta>`.
- **Permisos tras el despliegue:** `npm ci` y el build corren como root; hay que `chown -R autopartes:autopartes /srv/autopartes-air` **antes** del restart, o el servicio no puede leer sus propios archivos.
- **El repo vive en `/srv/autopartes-air`, nunca bajo `/var/www/html`**: ahí Nginx serviría el `.env` con los secretos.
- Como el repo pertenece a `autopartes` y se opera como root, git pide `git config --global --add safe.directory /srv/autopartes-air` (ya aplicado).
