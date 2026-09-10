import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthUser, PermissionCode, RoleName } from '@autopartes-air/shared';
import { env } from '../../infra/env';
import { db } from '../../infra/db';
import { permissions, rolePermissions, roles, users } from '../../db/schema';
import { badRequest, forbidden, unauthorized } from '../../middleware/error';
import type { AccessTokenPayload } from '../../middleware/auth';

const BCRYPT_ROUNDS = 10;

/**
 * Hash de un PIN que nadie tiene, para comparar contra él cuando el usuario no
 * existe o no fijó PIN. Así la respuesta tarda lo mismo en todos los casos y
 * no se puede deducir qué usuarios existen midiendo el tiempo.
 */
const DUMMY_PIN_HASH = bcrypt.hashSync('000000-inexistente', BCRYPT_ROUNDS);

interface RefreshTokenPayload {
  sub: number;
  /**
   * Si la sesión era "recordarme". Viaja dentro del token porque en `/refresh`
   * no hay otra forma de saberlo: la cookie llega sin sus atributos, así que
   * sin este dato una sesión de navegador se volvería persistente al renovarse.
   */
  remember?: boolean;
}

async function getPermissionsForRole(roleId: number): Promise<PermissionCode[]> {
  const rows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map((r) => r.code as PermissionCode);
}

async function getAuthUser(userId: number): Promise<AuthUser> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      roleId: users.roleId,
      roleName: roles.name,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      securityPin: users.securityPin,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  if (!row || !row.isActive) throw unauthorized('Usuario inactivo o inexistente');

  const perms = await getPermissionsForRole(row.roleId);
  // El hash del PIN no sale del servidor; el cliente solo necesita saber si existe.
  const { securityPin, ...rest } = row;
  return {
    ...rest,
    roleName: row.roleName as RoleName,
    createdAt: row.createdAt.toISOString(),
    permissions: perms,
    hasSecurityPin: securityPin != null,
  };
}

function signAccessToken(user: AuthUser): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    username: user.username,
    role: user.roleName,
    permissions: user.permissions,
    mustChangePassword: user.mustChangePassword,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  });
}

function signRefreshToken(userId: number, remember: boolean): string {
  const payload: RefreshTokenPayload = { sub: userId, remember };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'],
  });
}

export async function login(username: string, password: string, remember = false) {
  const [row] = await db.select().from(users).where(eq(users.username, username));
  if (!row) throw unauthorized('Credenciales inválidas');
  if (!row.isActive) throw unauthorized('Usuario inactivo');

  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) throw unauthorized('Credenciales inválidas');

  const user = await getAuthUser(row.id);
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user.id, remember),
  };
}

export async function refresh(refreshToken: string) {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as unknown as RefreshTokenPayload;
  } catch {
    throw unauthorized('Refresh token inválido o expirado');
  }

  // Se recargan usuario y permisos: si fue desactivado o cambió de rol, aplica ya
  const user = await getAuthUser(payload.sub);
  const remember = payload.remember ?? false;
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user.id, remember),
    remember,
  };
}

/** Lee el modo "recordarme" de un refresh token, sin validar nada más. */
export function rememberOf(refreshToken: string | undefined): boolean {
  if (!refreshToken) return false;
  try {
    const payload = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET,
    ) as unknown as RefreshTokenPayload;
    return payload.remember ?? false;
  } catch {
    return false;
  }
}

export async function me(userId: number): Promise<AuthUser> {
  return getAuthUser(userId);
}

/** Actualiza el perfil propio (por ahora, solo el nombre completo). */
export async function updateProfile(userId: number, fullName: string): Promise<AuthUser> {
  await db
    .update(users)
    .set({ fullName, updatedAt: new Date() })
    .where(eq(users.id, userId));
  return getAuthUser(userId);
}

/**
 * Cambia la contraseña propia, validando la contraseña actual.
 *
 * Devuelve una sesión nueva: al cambiarla se apaga `mustChangePassword`, y el
 * token anterior todavía lleva el flag encendido (viaja dentro del JWT). Sin
 * tokens frescos el usuario seguiría bloqueado hasta que expirara el access
 * token, hasta 15 minutos.
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  remember = false,
) {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  if (!row) throw unauthorized('Usuario inexistente');

  const ok = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!ok) throw badRequest('La contraseña actual es incorrecta');

  if (currentPassword === newPassword) {
    throw badRequest('La contraseña nueva debe ser distinta de la actual');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const user = await getAuthUser(userId);
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user.id, remember),
    remember,
  };
}

/**
 * Fija o cambia el PIN de autorización propio. Se pide la contraseña porque
 * el PIN avala acciones de otros (un cajero cambiando un precio): quien lo
 * fija tiene que probar que es él, no alguien que pasó por el equipo abierto.
 */
export async function setSecurityPin(
  userId: number,
  currentPassword: string,
  pin: string,
): Promise<AuthUser> {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  if (!row) throw unauthorized('Usuario inexistente');

  const ok = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!ok) throw badRequest('La contraseña es incorrecta');

  const securityPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);
  await db
    .update(users)
    .set({ securityPin, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return getAuthUser(userId);
}

/**
 * Verifica usuario + PIN y devuelve al autorizador, comprobando que tenga el
 * permiso pedido. Los mensajes de error no distinguen "usuario inexistente" de
 * "PIN incorrecto": sería un oráculo para adivinar quién tiene el permiso.
 */
export async function verifySecurityPin(
  username: string,
  pin: string,
  permission: PermissionCode,
): Promise<AuthUser> {
  const [row] = await db.select().from(users).where(eq(users.username, username));
  // Se compara igual contra un hash falso cuando el usuario no existe, para que
  // el tiempo de respuesta no delate qué usuarios existen.
  const hash = row?.securityPin ?? DUMMY_PIN_HASH;
  const ok = await bcrypt.compare(pin, hash);
  if (!row || !row.isActive || row.securityPin == null || !ok) {
    throw unauthorized('Usuario o PIN incorrecto');
  }

  const user = await getAuthUser(row.id);
  if (!user.permissions.includes(permission)) {
    throw forbidden(`${user.fullName} no tiene permiso para autorizar esta acción`);
  }
  return user;
}
