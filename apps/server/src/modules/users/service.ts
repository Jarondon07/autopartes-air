import bcrypt from 'bcryptjs';
import { and, asc, eq, ilike, ne, or, sql, type SQL } from 'drizzle-orm';
import { ROOT_ROLE, type CreateUserInput, type UpdateUserInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { roles, users } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard, withUniqueGuard } from '../../lib/db-errors';

const BCRYPT_ROUNDS = 10;
const DUP = 'Ya existe un usuario con ese nombre de usuario';
const IN_USE = 'No se puede eliminar: el usuario tiene registros asociados (desactívalo en su lugar)';

/** Columnas públicas de un usuario (nunca el hash de contraseña). */
const publicCols = {
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  roleId: users.roleId,
  roleName: roles.name,
  isActive: users.isActive,
  mustChangePassword: users.mustChangePassword,
  createdAt: users.createdAt,
};

export async function getById(id: number) {
  const [row] = await db
    .select(publicCols)
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id));
  if (!row) throw notFound('Usuario no encontrado');
  return row;
}

export async function list({ page, limit, q }: { page: number; limit: number; q?: string }) {
  // Nunca se listan usuarios con rol root (superusuario oculto).
  const conditions: SQL[] = [ne(roles.name, ROOT_ROLE)];
  if (q) {
    conditions.push(or(ilike(users.username, `%${q}%`), ilike(users.fullName, `%${q}%`))!);
  }
  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    db
      .select(publicCols)
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(where)
      .orderBy(asc(users.username))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}

/** Nombre del rol de un usuario (o null si no existe). Para guards de root. */
export async function getUserRoleName(id: number): Promise<string | null> {
  const [row] = await db
    .select({ name: roles.name })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, id));
  return row?.name ?? null;
}

/** Nombre de un rol por id (o null). Para validar asignación de rol. */
export async function getRoleNameById(roleId: number): Promise<string | null> {
  const [row] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId));
  return row?.name ?? null;
}

export async function create(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return withUniqueGuard(DUP, () =>
    withForeignKeyGuard('El rol indicado no existe', async () => {
      const [row] = await db
        .insert(users)
        .values({
          username: input.username,
          passwordHash,
          fullName: input.fullName,
          roleId: input.roleId,
          // La contraseña que fija el administrador es provisional: el usuario
          // debe cambiarla en su primer inicio de sesión.
          mustChangePassword: true,
        })
        .returning({ id: users.id });
      return getById(row!.id);
    }),
  );
}

export async function update(id: number, input: UpdateUserInput) {
  return withForeignKeyGuard('El rol indicado no existe', async () => {
    const [row] = await db
      .update(users)
      .set({
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.roleId !== undefined && { roleId: input.roleId }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!row) throw notFound('Usuario no encontrado');
    return getById(id);
  });
}

/** Reset por un administrador: la contraseña queda provisional. */
export async function resetPassword(id: number, password: string) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const [row] = await db
    .update(users)
    .set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id });
  if (!row) throw notFound('Usuario no encontrado');
}

export async function remove(id: number) {
  return withForeignKeyGuard(IN_USE, async () => {
    const [row] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (!row) throw notFound('Usuario no encontrado');
  });
}
