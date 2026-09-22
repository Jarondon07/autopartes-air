import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { InventoryAdjustmentInput, MovementType } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { inventoryMovements, products } from '../../db/schema';
import { badRequest, notFound } from '../../middleware/error';

/** Ejecutor: conexión global o transacción activa. */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

interface StockChange {
  productId: number;
  /** Con signo: positivo entra, negativo sale. */
  quantity: number;
  movementType: MovementType;
  userId: number;
  referenceType?: string | null;
  referenceId?: number | null;
  notes?: string | null;
}

/**
 * Aplica un cambio de stock a un producto y registra el movimiento auditable.
 * Debe llamarse dentro de una transacción. Reutilizable por compras y ventas.
 * Lanza 400 si el resultado dejaría el stock negativo.
 */
export async function applyStockChange(tx: Executor, change: StockChange) {
  const [product] = await tx
    .select({ stock: products.stock })
    .from(products)
    .where(eq(products.id, change.productId));
  if (!product) throw notFound(`Producto ${change.productId} no encontrado`);

  const stockAfter = product.stock + change.quantity;
  if (stockAfter < 0) {
    throw badRequest('Stock insuficiente para el movimiento solicitado');
  }

  await tx
    .update(products)
    .set({ stock: stockAfter, updatedAt: new Date() })
    .where(eq(products.id, change.productId));

  const [movement] = await tx
    .insert(inventoryMovements)
    .values({
      productId: change.productId,
      movementType: change.movementType,
      quantity: change.quantity,
      stockAfter,
      referenceType: change.referenceType ?? null,
      referenceId: change.referenceId ?? null,
      userId: change.userId,
      notes: change.notes ?? null,
    })
    .returning();
  return movement;
}

/** Ajuste manual de stock (movimiento tipo 'ajuste'). */
export async function adjust(input: InventoryAdjustmentInput, userId: number) {
  return db.transaction((tx) =>
    applyStockChange(tx, {
      productId: input.productId,
      quantity: input.quantity,
      movementType: 'ajuste',
      userId,
      notes: input.notes ?? null,
    }),
  );
}

interface ListParams {
  page: number;
  limit: number;
  productId?: number;
  movementType?: MovementType;
}

/** Historial de movimientos, con código y nombre del producto. */
export async function listMovements({ page, limit, productId, movementType }: ListParams) {
  const conditions: SQL[] = [];
  if (productId) conditions.push(eq(inventoryMovements.productId, productId));
  if (movementType) conditions.push(eq(inventoryMovements.movementType, movementType));
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: inventoryMovements.id,
        productId: inventoryMovements.productId,
        productCode: products.code,
        productName: products.name,
        movementType: inventoryMovements.movementType,
        quantity: inventoryMovements.quantity,
        stockAfter: inventoryMovements.stockAfter,
        referenceType: inventoryMovements.referenceType,
        referenceId: inventoryMovements.referenceId,
        userId: inventoryMovements.userId,
        notes: inventoryMovements.notes,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .innerJoin(products, eq(inventoryMovements.productId, products.id))
      .where(where)
      .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryMovements)
      .where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}
