import { asc, eq, sql } from 'drizzle-orm';
import type { TaxInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { taxes } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe un impuesto con ese nombre';

export function list() {
  return db.select().from(taxes).orderBy(asc(taxes.name));
}

export function create(input: TaxInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .insert(taxes)
      .values({ name: input.name, rate: input.rate.toString() })
      .returning();
    return row;
  });
}

export function update(id: number, input: TaxInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .update(taxes)
      .set({
        name: input.name,
        rate: input.rate.toString(),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      })
      .where(eq(taxes.id, id))
      .returning();
    if (!row) throw notFound('Impuesto no encontrado');
    return row;
  });
}

export async function remove(id: number) {
  const [row] = await db.delete(taxes).where(eq(taxes.id, id)).returning();
  if (!row) throw notFound('Impuesto no encontrado');
  return row;
}

/** Porcentaje total de impuestos aplicables = suma de los impuestos activos. */
export async function getAppliedRate(): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${taxes.rate}), 0)::float` })
    .from(taxes)
    .where(eq(taxes.isActive, true));
  return row?.total ?? 0;
}
