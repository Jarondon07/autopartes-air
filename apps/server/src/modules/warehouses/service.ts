import { asc, eq } from 'drizzle-orm';
import type { WarehouseInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { warehouses } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard, withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe un almacén con ese nombre';
const IN_USE = 'No se puede eliminar: hay productos asignados a este almacén';

export function list() {
  return db.select().from(warehouses).orderBy(asc(warehouses.name));
}

export function create(input: WarehouseInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .insert(warehouses)
      .values({ name: input.name.trim() })
      .returning();
    return row;
  });
}

export function update(id: number, input: WarehouseInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .update(warehouses)
      .set({
        name: input.name.trim(),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      })
      .where(eq(warehouses.id, id))
      .returning();
    if (!row) throw notFound('Almacén no encontrado');
    return row;
  });
}

export async function remove(id: number) {
  return withForeignKeyGuard(IN_USE, async () => {
    const [row] = await db.delete(warehouses).where(eq(warehouses.id, id)).returning();
    if (!row) throw notFound('Almacén no encontrado');
    return row;
  });
}
