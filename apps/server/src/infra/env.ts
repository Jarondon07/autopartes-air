import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/**
 * Carga de variables de entorno del sistema.
 *
 * Convención de archivos (relativos al cwd del paquete server):
 *   - producción  → `.env`
 *   - desarrollo/test → `.env.local`
 *
 * El modo se toma de `NODE_ENV` (definido por el runtime, no por el archivo).
 * Si no está definido, se asume `development` y se carga `.env.local`.
 */
const mode = process.env.NODE_ENV ?? 'development';
const envFile = mode === 'production' ? '.env' : '.env.local';

loadDotenv({ path: resolve(process.cwd(), envFile) });

const envSchema = z.object({
  PORT: z.coerce.number().int().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerida'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET muy corto'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET muy corto'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  /**
   * `secure` de la cookie del refresh token. Si no se define, sigue a `NODE_ENV`.
   * Sobre HTTP (producción accedida por IP, sin dominio ni TLS) debe ser `false`:
   * con `secure: true` el navegador descarta la cookie y la sesión se corta
   * al vencer el access token (15 min). Ponerlo en `true` al montar HTTPS.
   *
   * Se acepta vacío (`COOKIE_SECURE=` en el .env) como "no definido".
   */
  COOKIE_SECURE: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['true', 'false']).optional(),
  ),

  // --- Worker de tasa BCV automática ---
  // Si RADAR_API_KEY está vacío, el worker no se activa (solo tasa manual).
  RADAR_API_URL: z.string().default('https://radar.revolut.team/api/rates'),
  RADAR_API_KEY: z.string().default(''),
  /** Hora local (HH:MM) de la consulta diaria automática a Radar. */
  BCV_FETCH_TIME: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM')
    .default('00:30'),
  /** Tasa de emergencia si no hay ninguna registrada en la BD. */
  BCV_FALLBACK_RATE: z.coerce.number().positive().default(36),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(`❌ Variables de entorno inválidas (archivo: ${envFile}):`);
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

/** Todas las variables del sistema, validadas y tipadas. */
export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
/** `secure` efectivo de la cookie de refresh (env explícito o, si no, `isProd`). */
export const cookieSecure = env.COOKIE_SECURE
  ? env.COOKIE_SECURE === 'true'
  : env.NODE_ENV === 'production';
/** Archivo de entorno efectivamente cargado (útil para logs de arranque). */
export const loadedEnvFile = envFile;
