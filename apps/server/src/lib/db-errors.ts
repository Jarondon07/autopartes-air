import { conflict } from '../middleware/error';

/** Códigos de error de restricción en PostgreSQL. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

/**
 * Busca un código de error de PostgreSQL. Drizzle envuelve el error original
 * de `pg` en `err.cause`, así que se recorre la cadena de causas.
 */
function hasPgCode(err: unknown, code: string): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current != null; depth += 1) {
    if (
      typeof current === 'object' &&
      'code' in current &&
      (current as { code: unknown }).code === code
    ) {
      return true;
    }
    current =
      typeof current === 'object' && 'cause' in current
        ? (current as { cause: unknown }).cause
        : null;
  }
  return false;
}

/**
 * Ejecuta una operación de escritura y convierte una violación UNIQUE de
 * PostgreSQL en un ApiError 409 con un mensaje legible.
 */
export async function withUniqueGuard<T>(
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (hasPgCode(err, PG_UNIQUE_VIOLATION)) throw conflict(message);
    throw err;
  }
}

/**
 * Convierte una violación de clave foránea (registro en uso) en un 409.
 * Útil al eliminar catálogos referenciados por productos/transacciones.
 */
export async function withForeignKeyGuard<T>(
  message: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (hasPgCode(err, PG_FOREIGN_KEY_VIOLATION)) throw conflict(message);
    throw err;
  }
}
