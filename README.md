# AutoparteAIR

Sistema web para la **gestión de compra, venta e inventario de repuestos automotrices**, pensado para negocios en Venezuela.

## ¿Qué resuelve?

Un taller o tienda de repuestos en Venezuela tiene un problema particular: los precios se manejan en **dólares** pero se cobra en **bolívares** a una tasa que cambia todos los días. Este sistema resuelve eso y el control de inventario asociado:

- **Precios en doble moneda.** El costo y el precio de venta viven en USD (moneda canónica). Cada venta y cada compra guarda un *snapshot* de la tasa de cambio y del total en bolívares al momento de la transacción, así el historial nunca se distorsiona cuando la tasa cambia.
- **Tasas BCV y paralelo.** Historial de tasas por fecha y fuente, para registrar la del día y consultar las pasadas.
- **Precio de venta automático.** Se define un costo y un porcentaje de markup; el precio se calcula solo en la base de datos (columna generada), así nunca queda inconsistente.
- **Inventario auditable.** Todo movimiento de stock (compra, venta, ajuste, anulación) queda registrado con su motivo y el usuario responsable.
- **Roles diferenciados.** Pensado para equipos de 5 a 15 personas: administrador, vendedor, almacén y cajero, cada uno con permisos distintos.
- **API-first.** El backend es una API REST independiente, lo que permite construir una app móvil más adelante sin reescribir la lógica.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Monorepo | npm workspaces (sin Nx/Turborepo) |
| Frontend | React + Vite + TypeScript + Ant Design |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL |
| ORM | Drizzle ORM (migraciones versionadas, SQL legible) |
| Validación | Zod (schemas compartidos entre front y back) |
| Estado (front) | React Query (datos del servidor) + Zustand (auth y UI) |
| Autenticación | JWT (access 15 min + refresh 7 días en cookie httpOnly) + RBAC por permisos |

## Estructura del proyecto

```
autopartes-air/
├── apps/
│   ├── shared/     # @autopartes-air/shared — tipos, validadores Zod, constantes, utils de moneda
│   ├── server/     # @autopartes-air/server — API Express + Drizzle
│   │   └── src/
│   │       ├── db/schema/      # Esquema Drizzle (fuente de verdad)
│   │       ├── db/migrations/  # SQL generado por drizzle-kit
│   │       ├── db/seed.ts      # Datos iniciales (roles, permisos, usuarios, catálogos)
│   │       ├── middleware/     # auth, rbac, validate, error
│   │       ├── lib/            # helpers de respuesta y de errores de BD
│   │       └── modules/        # Un módulo por dominio: router.ts + service.ts
│   └── web/        # @autopartes-air/web — SPA React
│       └── src/
│           ├── api/        # Cliente Axios por módulo
│           ├── hooks/      # Hooks de React Query
│           ├── stores/     # Zustand (auth, ui)
│           ├── components/ # layout/, routing/
│           └── pages/      # Una carpeta por módulo
└── package.json    # Workspaces y scripts raíz
```

El paquete `shared` es la pieza clave: los mismos schemas de Zod validan en el servidor y tipan los formularios del frontend, así que no hay forma de que se desincronicen.

---

# Requisitos previos

- **Node.js 20 o superior**
- **PostgreSQL 14 o superior** corriendo en local
- **Git**

Verifica que los tengas:

```bash
node --version
psql --version
```

# Configuración inicial

### 1. Clonar e instalar dependencias

```bash
git clone <URL-DEL-REPOSITORIO>
cd autopartes-air
npm install
```

`npm install` en la raíz instala las dependencias de los tres paquetes y enlaza los workspaces entre sí.

### 2. Crear la base de datos

```bash
createdb -h localhost -U postgres autopartes-air
```

Si `createdb` no está en el PATH (típico en Windows), usa psql:

```bash
psql -h localhost -U postgres -c "CREATE DATABASE \"autopartes-air\";"
```

> El nombre lleva guion, por eso va entre comillas dobles escapadas.

### 3. Configurar las variables de entorno

El servidor carga `.env.local` en desarrollo y `.env` en producción. Ambos están en `.gitignore` y **nunca deben commitearse**.

```bash
cp apps/server/.env.example apps/server/.env.local
```

Luego edita `apps/server/.env.local` con tus valores reales:

```ini
PORT=4300
NODE_ENV=development
CORS_ORIGIN=http://localhost:4301

DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/autopartes-air

JWT_ACCESS_SECRET=<secreto-aleatorio>
JWT_REFRESH_SECRET=<secreto-aleatorio-distinto>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

Para generar secretos JWT seguros:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ejecútalo dos veces y usa un valor distinto para cada secreto.

### 4. Crear las tablas y sembrar datos

```bash
npm run db:migrate
npm run db:seed
```

Esto crea las 17 tablas y carga los roles, los 29 permisos, los catálogos base (categorías y marcas) y dos usuarios de prueba.

# Inicialización (levantar el proyecto)

Desde la raíz del proyecto:

```bash
npm run dev
```

Un solo comando levanta **ambos servicios** en paralelo:

- **API** → http://localhost:4300/api/v1
- **Web** → http://localhost:4301

Abre **http://localhost:4301** en el navegador.

### Usuarios de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador (todos los permisos) |
| `vendedor1` | `vendedor123` | Vendedor |

> Son credenciales de desarrollo. Cámbialas antes de cualquier despliegue real.

### Levantar los servicios por separado

Útil si quieres logs separados o reiniciar solo uno:

```bash
npm run dev:server   # solo la API (4300)
npm run dev:web      # solo la web (4301)
```

> **Importante:** los dos servicios deben estar corriendo. La web hace proxy de `/api` hacia el puerto 4300; si el servidor no está levantado, cualquier petición devolverá un error 500.

Para detenerlos: `Ctrl + C` en la terminal correspondiente.

# Scripts disponibles

Todos se ejecutan desde la raíz del proyecto.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta API y web juntos |
| `npm run dev:server` | Levanta solo la API |
| `npm run dev:web` | Levanta solo la web |
| `npm run build` | Compila todos los paquetes para producción |
| `npm run typecheck` | Verifica los tipos de TypeScript en todo el monorepo |
| `npm run db:generate` | Genera una migración SQL a partir de cambios en el esquema |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:seed` | Carga los datos iniciales |

### Flujo para cambiar el esquema de la base de datos

1. Edita los archivos en `apps/server/src/db/schema/`
2. `npm run db:generate` — genera el SQL de la migración
3. Revisa el archivo generado en `apps/server/src/db/migrations/`
4. `npm run db:migrate` — lo aplica

Las migraciones **sí se commitean**: son parte del código y deben viajar con el repositorio.

# Puertos

El proyecto tiene asignado el rango **4300-4399** para no chocar con otros proyectos locales.

| Puerto | Servicio |
|:---:|---|
| 4300 | API (server) |
| 4301 | Web (Vite) |
| 5432 | PostgreSQL (instancia local compartida) |

Si necesitas cambiarlos, hay que tocar tres lugares de forma coordinada:

- `apps/server/.env.local` → `PORT` y `CORS_ORIGIN`
- `apps/web/vite.config.ts` → `server.port` y el `target` del proxy

# Roles y permisos

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

Los permisos se verifican en dos capas: el middleware `requirePermission` en el servidor (autoridad real) y el componente `RequirePermission` en el frontend (solo para ocultar la interfaz).

# API REST

Base: `/api/v1`

Formato de respuesta estándar:

```jsonc
// Éxito
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 0 } }

// Error
{ "success": false, "error": { "code": "CONFLICT", "message": "...", "details": {} } }
```

### Endpoints disponibles

| Recurso | Endpoints |
|---|---|
| **Auth** | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| **Productos** | `GET /products`, `GET /products/search?q=`, `GET /products/low-stock`, `GET /products/:id`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **Categorías** | `GET /categories`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **Marcas** | `GET /brands`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **Vehículos** | `GET /vehicles`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **Clientes** | `GET /clients`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **Proveedores** | `GET /suppliers`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` |
| **Tasas de cambio** | `GET /exchange-rates/current`, `GET /exchange-rates`, `POST` |

Todos los endpoints (excepto `login` y `refresh`) requieren el header `Authorization: Bearer <access-token>`.

# Estado del desarrollo

| Fase | Alcance | Estado |
|---|---|---|
| **Fase 1** | Monorepo, esquema de BD, migraciones, seed, autenticación JWT + RBAC | ✅ Completada |
| **Fase 2** | CRUD de productos, catálogos, clientes, proveedores y tasas + pantalla de productos | ✅ Completada |
| **Fase 3** | Compras y ventas (POS), movimientos de inventario, ajustes | ⏳ Pendiente |
| **Fase 4** | Reportes, dashboard con datos reales, gestión de usuarios, impresión de recibos | ⏳ Pendiente |

Las pantallas de módulos aún no implementados muestran un marcador de posición.

# Solución de problemas

**La web carga pero todas las peticiones fallan con error 500**
El servidor de API no está levantado. La web (4301) hace proxy hacia el 4300; si no hay nada escuchando ahí, el proxy devuelve 500. Levanta ambos con `npm run dev`.

**`Port 4301 is in use`**
Ya hay una instancia corriendo. Ciérrala o identifica el proceso:
```bash
netstat -ano | grep 4301
```

**Error de conexión a la base de datos**
Verifica que PostgreSQL esté activo y que las credenciales de `DATABASE_URL` sean correctas:
```bash
pg_isready -h localhost -p 5432
```

**`npm run db:migrate` falla sin mostrar un error claro**
Es un problema conocido de `drizzle-kit` en Windows: falla con código 1 pero sin mensaje. Alternativa, aplicar el SQL directamente:
```bash
psql -h localhost -U postgres -d autopartes-air -f apps/server/src/db/migrations/0000_fair_sebastian_shaw.sql
```

**Cambios en `shared` que el servidor o la web no reconocen**
Reinicia el proceso de desarrollo; los workspaces se resuelven al arrancar.

# Convenciones del proyecto

- **Dinero:** siempre `NUMERIC(14,2)` en la base de datos, nunca `float`. En TypeScript los montos llegan como `string` para no perder precisión.
- **Tasas de cambio:** `NUMERIC(14,4)`.
- **Precio de venta:** columna generada por la base de datos (`costo × (1 + markup/100)`), no se escribe a mano.
- **Borrado de productos:** baja lógica (`isActive = false`), para conservar el historial de ventas y compras.
- **Módulos del servidor:** cada uno con `router.ts` (rutas, permisos y validación) y `service.ts` (lógica y acceso a datos).
- **Validación:** los schemas de Zod viven en `shared` y se usan en ambos lados.
