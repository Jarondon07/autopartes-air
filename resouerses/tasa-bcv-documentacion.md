# Sistema de Tasa de Cambio BCV

Consulta automática de la tasa USD/VES del Banco Central de Venezuela, almacenamiento en PostgreSQL y exposición vía API REST.

---

## Flujo general

```
Radar API → Worker (cada 1h) → exchange_rates (PostgreSQL) → GET /api/config/bcv-rate → Clientes
```

---

## 1. Modelo de datos (Prisma)

Una sola tabla almacena tanto las tasas automáticas como las manuales. Solo una fila tiene `active = true` a la vez (controlado por lógica de aplicación).

```prisma
model ExchangeRate {
  id        String             @id @default(uuid())
  rate      Decimal            @db.Decimal(10, 2)
  source    ExchangeRateSource
  active    Boolean            @default(true)
  createdBy String?
  note      String?
  createdAt DateTime           @default(now())

  @@index([active, createdAt(sort: Desc)])
  @@map("exchange_rates")
}

enum ExchangeRateSource {
  BCV_API
  MANUAL
}
```

| Campo | Propósito |
|-------|-----------|
| `rate` | Tasa USD→VES con 2 decimales (ej: `62.45`) |
| `source` | `BCV_API` = automática, `MANUAL` = admin override |
| `active` | Solo una fila activa. Al insertar nueva, se desactivan las anteriores |
| `createdBy` | userId del admin (solo en `MANUAL`) |
| `note` | Nota opcional del admin (solo en `MANUAL`) |

---

## 2. Worker — Fetcher automático

Un servicio independiente (container Docker separado) que consulta la API de Radar y actualiza la tasa si cambió.

### Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | — | Connection string PostgreSQL |
| `RADAR_API_URL` | `https://radar.revolut.team/api/rates` | Endpoint del proveedor de tasas |
| `RADAR_API_KEY` | — | Bearer token para autenticar |
| `FETCH_INTERVAL_MS` | `3600000` (1h) | Intervalo de consulta en ms |

### Config del worker

```typescript
// config/env.ts
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  RADAR_API_URL: process.env.RADAR_API_URL ?? 'https://radar.revolut.team/api/rates',
  RADAR_API_KEY: process.env.RADAR_API_KEY ?? '',
  FETCH_INTERVAL_MS: Number(process.env.FETCH_INTERVAL_MS) || 3_600_000,
};
```

### Job de consulta

```typescript
// jobs/fetch-bcv-rate.ts

// 1. Consulta la API de Radar
async function fetchFromRadar(): Promise<number | null> {
  const res = await fetch(env.RADAR_API_URL, {
    headers: { Authorization: `Bearer ${env.RADAR_API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  // Busca: source=bcv, baseCurrency=USD, quoteCurrency=VES
  const entry = data.find(r =>
    r.source === 'bcv' &&
    r.baseCurrency === 'USD' &&
    r.quoteCurrency === 'VES'
  );
  return entry ? Math.round(entry.midRate * 100) / 100 : null;
}

// 2. Actualiza la BD solo si la tasa cambió
async function fetchBcvRateJob() {
  try {
    const rate = await fetchFromRadar();
    if (!rate) return;

    const current = await prisma.exchangeRate
      .findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });

    if (current && Number(current.rate) === rate) return; // sin cambios

    // Transacción: desactiva todas → crea nueva activa
    await prisma.$transaction([
      prisma.exchangeRate.updateMany({
        where: { active: true },
        data:  { active: false },
      }),
      prisma.exchangeRate.create({
        data: { rate, source: 'BCV_API', active: true },
      }),
    ]);
  } catch (err) {
    logger.error(err, 'Error fetching BCV rate');
    // No lanza — reintenta en el próximo intervalo
  }
}
```

### Scheduler

```typescript
// index.ts
// Ejecución inmediata al arrancar + intervalo periódico
fetchBcvRateJob();
setInterval(fetchBcvRateJob, env.FETCH_INTERVAL_MS);
```

> **Resiliente a fallos:** El job captura errores internamente (try/catch + log). Un fallo de red no crashea el worker; simplemente reintenta en el próximo intervalo.

---

## 3. API Service — Lectura de la tasa

```typescript
// services/bcv.service.ts

export async function getBcvRate(): Promise<number> {
  const row = await prisma.exchangeRate.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) {
    logger.warn('No hay tasa BCV en BD, usando fallback 36');
    return 36;
  }
  return Number(row.rate);
}

export async function getBcvRateDetail() {
  const row = await prisma.exchangeRate.findFirst({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
  });
  return row
    ? { rate: Number(row.rate), updatedAt: row.createdAt, source: row.source }
    : { rate: 36, updatedAt: new Date(), source: 'FALLBACK' };
}

export function usdToBs(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}
```

> **Fallback:** Si la BD está vacía (primer deploy, seed no ejecutado), la tasa retorna `36 VES/USD` como valor de emergencia. Ajustar este valor según el proyecto.

---

## 4. Endpoints REST

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/config/bcv-rate` | Público | Tasa activa + source + timestamp |
| `GET` | `/api/config/bcv-rate/history` | Admin | Últimas 50 tasas (historial) |
| `POST` | `/api/config/bcv-rate` | Admin | Override manual (body: `{ rate, note? }`) |

### Respuesta de GET /bcv-rate

```json
{
  "success": true,
  "data": {
    "rate": 62.45,
    "currency": "VES",
    "source": "BCV_API",
    "updatedAt": "2026-08-04T12:00:00.000Z"
  }
}
```

### Override manual (POST)

```typescript
// Validación Zod
{
  rate: z.number().positive().max(100_000),
  note: z.string().optional()
}

// El override se guarda con source: 'MANUAL' y createdBy: userId
// La próxima ejecución del worker la sobreescribirá si BCV publica
// un valor diferente
```

---

## 5. Conversión USD → Bolívares

En cualquier punto del backend donde necesites convertir:

```typescript
import { getBcvRate, usdToBs } from '../services/bcv.service.js';

// Ejemplo: calcular precio en Bs de un producto de $15 USD
const rate = await getBcvRate();          // 62.45
const priceBs = usdToBs(15, rate);       // 936.75
```

---

## 6. Docker Compose

El worker corre como un servicio Docker independiente que comparte la misma `DATABASE_URL` que el backend.

```yaml
worker:
  build:
    context: ../apps/worker
    target: dev
  env_file: ../.env.local
  depends_on:
    - db
  restart: unless-stopped
```

---

## 7. Dependencias

| Paquete | Dónde | Para qué |
|---------|-------|----------|
| `@prisma/client` | Worker + API | Acceso a PostgreSQL |
| `pino` + `pino-pretty` | Worker + API | Logging estructurado |
| `zod` | API | Validación de inputs (override manual) |
| `tsx` | Worker (dev) | Ejecución TypeScript directa con watch |

> **Sin dependencias HTTP externas:** El worker usa `fetch()` nativo de Node.js 18+. No requiere axios ni similar.

---

## 8. Checklist de implementación

1. Agregar modelo `ExchangeRate` + enum `ExchangeRateSource` al schema Prisma
2. Crear el servicio `bcv.service.ts` con `getBcvRate()`, `getBcvRateDetail()`, `usdToBs()`
3. Crear las rutas `GET /bcv-rate`, `GET /bcv-rate/history`, `POST /bcv-rate`
4. Crear el worker con el job `fetchBcvRateJob` + scheduler `setInterval`
5. Configurar variables de entorno: `RADAR_API_URL`, `RADAR_API_KEY`, `FETCH_INTERVAL_MS`
6. Agregar servicio `worker` al `docker-compose.yml`
7. Seed: insertar una fila inicial con tasa conocida para evitar el fallback
8. En el frontend: llamar a `GET /bcv-rate` para mostrar precios en Bs
