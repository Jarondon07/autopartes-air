import { asc, eq } from 'drizzle-orm';
import type { BrandInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { brands } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard, withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe una marca con ese nombre';
const IN_USE = 'No se puede eliminar: la marca tiene productos asociados';

export function list() {
  return db.select().from(brands).orderBy(asc(brands.name));
}

export function create(input: BrandInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db.insert(brands).values(input).returning();
    return row;
  });
}

export function update(id: number, input: BrandInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db.update(brands).set(input).where(eq(brands.id, id)).returning();
    if (!row) throw notFound('Marca no encontrada');
    return row;
  });
}

export function remove(id: number) {
  return withForeignKeyGuard(IN_USE, async () => {
    const [row] = await db.delete(brands).where(eq(brands.id, id)).returning();
    if (!row) throw notFound('Marca no encontrada');
    return row;
  });
}
