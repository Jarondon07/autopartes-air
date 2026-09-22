import { asc, eq } from 'drizzle-orm';
import type { CarBrandInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { carBrands } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard, withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe una marca de vehículo con ese nombre';
const IN_USE = 'No se puede eliminar: la marca tiene modelos asociados';

export function list() {
  return db.select().from(carBrands).orderBy(asc(carBrands.name));
}

export function create(input: CarBrandInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .insert(carBrands)
      .values({
        name: input.name,
        abbreviation: input.abbreviation ?? null,
        logoUrl: input.logoUrl ?? null,
      })
      .returning();
    return row;
  });
}

export function update(id: number, input: CarBrandInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .update(carBrands)
      .set({
        name: input.name,
        abbreviation: input.abbreviation ?? null,
        logoUrl: input.logoUrl ?? null,
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      })
      .where(eq(carBrands.id, id))
      .returning();
    if (!row) throw notFound('Marca no encontrada');
    return row;
  });
}

export function remove(id: number) {
  return withForeignKeyGuard(IN_USE, async () => {
    const [row] = await db.delete(carBrands).where(eq(carBrands.id, id)).returning();
    if (!row) throw notFound('Marca no encontrada');
    return row;
  });
}
