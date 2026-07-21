import { and, asc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { SupplierInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { suppliers } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard, withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe un proveedor con ese RIF';
const IN_USE = 'No se puede eliminar: el proveedor tiene compras asociadas';

interface ListParams {
  page: number;
  limit: number;
  q?: string;
}

export async function list({ page, limit, q }: ListParams) {
  const conditions: SQL[] = [];
  if (q) {
    conditions.push(or(ilike(suppliers.name, `%${q}%`), ilike(suppliers.rif, `%${q}%`))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(suppliers)
      .where(where)
      .orderBy(asc(suppliers.name))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(suppliers).where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}

export async function getById(id: number) {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id));
  if (!row) throw notFound('Proveedor no encontrado');
  return row;
}

export function create(input: SupplierInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db.insert(suppliers).values(input).returning();
    return row;
  });
}

export function update(id: number, input: SupplierInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .update(suppliers)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    if (!row) throw notFound('Proveedor no encontrado');
    return row;
  });
}

export function remove(id: number) {
  return withForeignKeyGuard(IN_USE, async () => {
    const [row] = await db.delete(suppliers).where(eq(suppliers.id, id)).returning();
    if (!row) throw notFound('Proveedor no encontrado');
    return row;
  });
}
