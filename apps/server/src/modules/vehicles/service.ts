import { asc, eq } from 'drizzle-orm';
import type { VehicleInput } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { vehicles } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe un vehículo con esa marca, modelo y años';

export function list() {
  return db
    .select()
    .from(vehicles)
    .orderBy(asc(vehicles.make), asc(vehicles.model));
}

export function create(input: VehicleInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db.insert(vehicles).values(input).returning();
    return row;
  });
}

export function update(id: number, input: VehicleInput) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .update(vehicles)
      .set(input)
      .where(eq(vehicles.id, id))
      .returning();
    if (!row) throw notFound('Vehículo no encontrado');
    return row;
  });
}

/** El borrado propaga en cascada a product_vehicles (compatibilidades). */
export async function remove(id: number) {
  const [row] = await db.delete(vehicles).where(eq(vehicles.id, id)).returning();
  if (!row) throw notFound('Vehículo no encontrado');
  return row;
}
