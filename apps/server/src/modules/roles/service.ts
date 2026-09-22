import { asc, eq, inArray, ne } from 'drizzle-orm';
import { ROOT_ROLE, type CreateRoleInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { permissions, rolePermissions, roles } from '../../db/schema';
import { badRequest, conflict, notFound } from '../../middleware/error';
import { withUniqueGuard } from '../../lib/db-errors';

/** Catálogo de todos los permisos (para el editor). */
export function listPermissions() {
  return db.select().from(permissions).orderBy(asc(permissions.code));
}

/** Todos los roles (excepto el rol root, oculto) con sus códigos de permiso. */
export async function list() {
  const [allRoles, rp] = await Promise.all([
    db.select().from(roles).where(ne(roles.name, ROOT_ROLE)).orderBy(asc(roles.id)),
    db
      .select({ roleId: rolePermissions.roleId, code: permissions.code })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id)),
  ]);

  const byRole = new Map<number, string[]>();
  for (const r of rp) {
    const arr = byRole.get(r.roleId) ?? [];
    arr.push(r.code);
    byRole.set(r.roleId, arr);
  }
  return allRoles.map((role) => ({ ...role, permissions: byRole.get(role.id) ?? [] }));
}

async function getOne(roleId: number) {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) throw notFound('Rol no encontrado');
  const rows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
  return { ...role, permissions: rows.map((r) => r.code) };
}

/** Asigna el conjunto de permisos a un rol (reemplaza los actuales). */
async function assignPermissions(roleId: number, codes: string[]) {
  const perms = codes.length
    ? await db.select().from(permissions).where(inArray(permissions.code, codes))
    : [];
  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (perms.length) {
      await tx
        .insert(rolePermissions)
        .values(perms.map((p) => ({ roleId, permissionId: p.id })));
    }
  });
}

/** Reemplaza el set de permisos de un rol. El rol root no es editable. */
export async function setPermissions(roleId: number, codes: string[]) {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) throw notFound('Rol no encontrado');
  if (role.name === ROOT_ROLE) throw badRequest('El rol root no se puede modificar');

  await assignPermissions(roleId, codes);
  return getOne(roleId);
}

/** Crea un rol nuevo (dinámico) con su set de permisos. */
export async function create(input: CreateRoleInput) {
  if (input.name === ROOT_ROLE) throw conflict('Ese nombre de rol está reservado');

  const role = await withUniqueGuard('Ya existe un rol con ese nombre', async () => {
    const [row] = await db
      .insert(roles)
      .values({ name: input.name, description: input.description ?? null })
      .returning();
    return row!;
  });

  await assignPermissions(role.id, input.permissions);
  return getOne(role.id);
}
