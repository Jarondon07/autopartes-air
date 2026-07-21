import { and, asc, eq, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import type {
  CreateProductInput,
  ProductFilters,
  UpdateProductInput,
} from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { products, productVehicles } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withUniqueGuard } from '../../lib/db-errors';

const DUP_CODE = 'Ya existe un producto con ese código';

/** Ejecutor de consultas: la conexión global o una transacción activa. */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** IDs de vehículos compatibles asociados a un producto. */
async function getVehicleIds(exec: Executor, productId: number): Promise<number[]> {
  const rows = await exec
    .select({ vehicleId: productVehicles.vehicleId })
    .from(productVehicles)
    .where(eq(productVehicles.productId, productId));
  return rows.map((r) => r.vehicleId);
}

/** Reemplaza el set de vehículos compatibles de un producto. */
async function setVehicles(
  tx: Executor,
  productId: number,
  vehicleIds: number[],
): Promise<void> {
  await tx.delete(productVehicles).where(eq(productVehicles.productId, productId));
  if (vehicleIds.length > 0) {
    await tx
      .insert(productVehicles)
      .values(vehicleIds.map((vehicleId) => ({ productId, vehicleId })));
  }
}

export async function list(f: ProductFilters) {
  const conditions: SQL[] = [];
  if (f.q) {
    conditions.push(
      or(ilike(products.name, `%${f.q}%`), ilike(products.code, `%${f.q}%`))!,
    );
  }
  if (f.categoryId) conditions.push(eq(products.categoryId, f.categoryId));
  if (f.brandId) conditions.push(eq(products.brandId, f.brandId));
  if (f.isActive !== undefined) conditions.push(eq(products.isActive, f.isActive));
  if (f.vehicleId) {
    conditions.push(
      inArray(
        products.id,
        db
          .select({ id: productVehicles.productId })
          .from(productVehicles)
          .where(eq(productVehicles.vehicleId, f.vehicleId)),
      ),
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (f.page - 1) * f.limit;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(asc(products.name))
      .limit(f.limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}

/** Búsqueda rápida para el POS: hasta 20 productos activos por código o nombre. */
export async function search(q: string) {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        or(ilike(products.name, `%${q}%`), ilike(products.code, `%${q}%`)),
      ),
    )
    .orderBy(asc(products.name))
    .limit(20);
}

/** Productos activos cuyo stock es menor o igual a su stock mínimo. */
export async function lowStock() {
  return db
    .select()
    .from(products)
    .where(and(eq(products.isActive, true), lte(products.stock, products.minStock)))
    .orderBy(asc(products.stock));
}

export async function getById(id: number) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) throw notFound('Producto no encontrado');
  const vehicleIds = await getVehicleIds(db, id);
  return { ...product, vehicleIds };
}

export async function create(input: CreateProductInput) {
  const { vehicleIds, costUsd, markupPct, ...rest } = input;
  return withUniqueGuard(DUP_CODE, () =>
    db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          ...rest,
          costUsd: costUsd.toString(),
          markupPct: markupPct.toString(),
        })
        .returning();
      if (!product) throw new Error('No se pudo crear el producto');
      await setVehicles(tx, product.id, vehicleIds ?? []);
      return { ...product, vehicleIds: vehicleIds ?? [] };
    }),
  );
}

export async function update(id: number, input: UpdateProductInput) {
  const { vehicleIds, costUsd, markupPct, ...rest } = input;
  return withUniqueGuard(DUP_CODE, () =>
    db.transaction(async (tx) => {
      const [existing] = await tx.select().from(products).where(eq(products.id, id));
      if (!existing) throw notFound('Producto no encontrado');

      const [product] = await tx
        .update(products)
        .set({
          ...rest,
          ...(costUsd !== undefined && { costUsd: costUsd.toString() }),
          ...(markupPct !== undefined && { markupPct: markupPct.toString() }),
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
      if (!product) throw notFound('Producto no encontrado');

      if (vehicleIds !== undefined) {
        await setVehicles(tx, id, vehicleIds);
      }
      return {
        ...product,
        vehicleIds: vehicleIds ?? (await getVehicleIds(tx, id)),
      };
    }),
  );
}

/** Baja lógica: marca el producto como inactivo (conserva historial). */
export async function remove(id: number) {
  const [product] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  if (!product) throw notFound('Producto no encontrado');
  return product;
}
