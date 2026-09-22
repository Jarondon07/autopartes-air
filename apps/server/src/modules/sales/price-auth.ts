import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../infra/env';
import { forbidden } from '../../middleware/error';

/**
 * Autorización para vender fuera del precio de lista.
 *
 * El administrador no presta su sesión: teclea su PIN, el servidor emite este
 * token de vida corta y el cajero lo adjunta a la venta. Dura lo que dura una
 * venta a propósito — si el cajero se guarda el token, a los 5 minutos no le
 * sirve para la siguiente.
 */
const SCOPE = 'price_override';
const TTL = '5m';

interface PriceAuthPayload {
  scope: typeof SCOPE;
  /** Usuario que avala el precio (queda en `sale_details.authorized_by`). */
  authorizerId: number;
  authorizerName: string;
}

export function signPriceAuthToken(authorizerId: number, authorizerName: string): string {
  const payload: PriceAuthPayload = { scope: SCOPE, authorizerId, authorizerName };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: TTL as SignOptions['expiresIn'],
  });
}

/** Devuelve el autorizador, o lanza 403 si el token no vale o ya venció. */
export function verifyPriceAuthToken(token: string): PriceAuthPayload {
  let payload: PriceAuthPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as PriceAuthPayload;
  } catch {
    throw forbidden('La autorización de precio venció. Pide el PIN otra vez.');
  }
  if (payload?.scope !== SCOPE) throw forbidden('Autorización de precio inválida');
  return payload;
}

export const PRICE_AUTH_TTL = TTL;
