import { and, asc, eq, type SQL } from 'drizzle-orm';
import type { CarModelInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { carModels } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard, withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe un modelo con ese nombre en esa marca';

export function list(brandId?: number) {
  const conditions: SQL[] = [];
  if (brandId) conditions.push(eq(carModels.brandId, brandId));
  return db
    .select()
    .from(carModels)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(carModels.name));
}

export function create(input: CarModelInput) {
  return withUniqueGuard(DUP, () =>
    withForeignKeyGuard('La marca indicada no existe', async () => {
      const [row] = await db
        .insert(carModels)
        .values({ brandId: input.brandId, name: input.name })
        .returning();
      return row;
    }),
  );
}

export function update(id: number, input: CarModelInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .update(carModels)
      .set({
        brandId: input.brandId,
        name: input.name,
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      })
      .where(eq(carModels.id, id))
      .returning();
    if (!row) throw notFound('Modelo no encontrado');
    return row;
  });
}

export async function remove(id: number) {
  const [row] = await db.delete(carModels).where(eq(carModels.id, id)).returning();
  if (!row) throw notFound('Modelo no encontrado');
  return row;
}
