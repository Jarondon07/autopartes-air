import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { ClientInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { clients } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard, withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe un cliente con ese documento';
const IN_USE = 'No se puede eliminar: el cliente tiene ventas asociadas';

interface ListParams {
  page: number;
  limit: number;
  q?: string;
}

export async function list({ page, limit, q }: ListParams) {
  const conditions: SQL[] = [];
  if (q) {
    conditions.push(
      or(ilike(clients.name, `%${q}%`), ilike(clients.documentNumber, `%${q}%`))!,
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(clients)
      .where(where)
      .orderBy(asc(clients.name))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(clients).where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}

export async function getById(id: number) {
  const [row] = await db.select().from(clients).where(eq(clients.id, id));
  if (!row) throw notFound('Cliente no encontrado');
  return row;
}

export function create(input: ClientInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db.insert(clients).values(input).returning();
    return row;
  });
}

export function update(id: number, input: ClientInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .update(clients)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    if (!row) throw notFound('Cliente no encontrado');
    return row;
  });
}

export function remove(id: number) {
  return withForeignKeyGuard(IN_USE, async () => {
    const [row] = await db.delete(clients).where(eq(clients.id, id)).returning();
    if (!row) throw notFound('Cliente no encontrado');
    return row;
  });
}
