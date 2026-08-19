import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthUser, PermissionCode, RoleName } from '@autopartes-air/shared';
import { env } from '../../infra/env';
import { db } from '../../infra/db';
import { permissions, rolePermissions, roles, users } from '../../db/schema';
import { badRequest, unauthorized } from '../../middleware/error';
import type { AccessTokenPayload } from '../../middleware/auth';

const BCRYPT_ROUNDS = 10;

interface RefreshTokenPayload {
  sub: number;
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
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  if (!row || !row.isActive) throw unauthorized('Usuario inactivo o inexistente');

  const perms = await getPermissionsForRole(row.roleId);
  return {
    ...row,
    roleName: row.roleName as RoleName,
    createdAt: row.createdAt.toISOString(),
    permissions: perms,
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

function signRefreshToken(userId: number): string {
  const payload: RefreshTokenPayload = { sub: userId };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'],
  });
}

export async function login(username: string, password: string) {
  const [row] = await db.select().from(users).where(eq(users.username, username));
  if (!row) throw unauthorized('Credenciales inválidas');
  if (!row.isActive) throw unauthorized('Usuario inactivo');

  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) throw unauthorized('Credenciales inválidas');

  const user = await getAuthUser(row.id);
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user.id),
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
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user.id),
  };
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
    refreshToken: signRefreshToken(user.id),
  };
}
