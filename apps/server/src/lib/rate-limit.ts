/**
 * Limitador de intentos en memoria, para las rutas que verifican secretos
 * (login, PIN de autorización). Sin esto, cualquiera puede probar los 10.000
 * PIN de 4 dígitos en un bucle.
 *
 * Vive en el proceso: alcanza porque la API corre en una sola instancia. Si
 * algún día se levantan varias, esto hay que moverlo a la base o a Redis.
 */

interface Bucket {
  /** Intentos fallidos acumulados. */
  hits: number;
  /** Momento en que el conteo se reinicia. */
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Limpia lo vencido para que el Map no crezca sin fin. */
function purge(now: number) {
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Intentos fallidos permitidos dentro de la ventana. */
  max: number;
  /** Duración de la ventana, en milisegundos. */
  windowMs: number;
}

/**
 * ¿Este identificador (IP, usuario) todavía puede intentar?
 * Devuelve los segundos que faltan para poder reintentar, o 0 si puede.
 */
export function retryAfter(key: string, { max, windowMs }: RateLimitOptions): number {
  const now = Date.now();
  purge(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return 0;
  if (bucket.hits < max) return 0;
  return Math.ceil((bucket.resetAt - now) / 1000);
}

/** Anota un intento fallido. La ventana arranca con el primer fallo. */
export function registerFailure(key: string, { windowMs }: RateLimitOptions): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { hits: 1, resetAt: now + windowMs });
    return;
  }
  bucket.hits += 1;
}

/** Un intento exitoso borra el historial: el que acierta no queda penalizado. */
export function clearFailures(key: string): void {
  buckets.delete(key);
}
