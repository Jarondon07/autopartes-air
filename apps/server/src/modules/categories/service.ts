import { asc, eq } from 'drizzle-orm';
import type { CategoryInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { categories } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard, withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe una categoría con ese nombre o código';
const IN_USE = 'No se puede eliminar: la categoría tiene productos asociados';

export function list() {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export function create(input: CategoryInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db.insert(categories).values(input).returning();
    return row;
  });
}

export function update(id: number, input: CategoryInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .update(categories)
      .set(input)
      .where(eq(categories.id, id))
      .returning();
    if (!row) throw notFound('Categoría no encontrada');
    return row;
  });
}

export function remove(id: number) {
  return withForeignKeyGuard(IN_USE, async () => {
    const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
    if (!row) throw notFound('Categoría no encontrada');
    return row;
  });
}
