import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { round2, type CreatePurchaseInput, type PurchaseFilters } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { products, purchaseDetails, purchases, suppliers } from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withForeignKeyGuard } from '../../lib/db-errors';
import { applyStockChange } from '../inventory/service';
import { getBcvRate } from '../exchange-rates/service';

/**
 * Crea una compra (lote de entrada):
 *  - snapshot de la tasa BCV vigente y totales USD/Bs,
 *  - por cada renglón: suma stock + registra movimiento 'compra' y
 *    actualiza el costo del producto al último costo (recalcula precio venta).
 */
export async function create(input: CreatePurchaseInput, userId: number) {
  const rate = await getBcvRate();

  const details = input.details.map((d) => ({
    ...d,
    subtotalUsd: round2(d.quantity * d.unitCostUsd),
  }));
  const totalUsd = round2(details.reduce((sum, d) => sum + d.subtotalUsd, 0));
  const totalBs = round2(totalUsd * rate);

  const purchaseId = await withForeignKeyGuard(
    'Proveedor o producto inexistente',
    () =>
      db.transaction(async (tx) => {
        const [purchase] = await tx
          .insert(purchases)
          .values({
            supplierId: input.supplierId,
            userId,
            invoiceNumber: input.invoiceNumber ?? null,
            ...(input.purchaseDate && { purchaseDate: new Date(input.purchaseDate) }),
            exchangeRate: rate.toString(),
            totalUsd: totalUsd.toString(),
            totalBs: totalBs.toString(),
            notes: input.notes ?? null,
          })
          .returning();
        if (!purchase) throw new Error('No se pudo crear la compra');

        for (const d of details) {
          await tx.insert(purchaseDetails).values({
            purchaseId: purchase.id,
            productId: d.productId,
            quantity: d.quantity,
            unitCostUsd: d.unitCostUsd.toString(),
            subtotalUsd: d.subtotalUsd.toString(),
          });

          // Suma stock + movimiento auditable 'compra'.
          await applyStockChange(tx, {
            productId: d.productId,
            quantity: d.quantity,
            movementType: 'compra',
            userId,
            referenceType: 'purchase',
            referenceId: purchase.id,
          });

          // Último costo: el producto toma el costo de este lote (recalcula precio).
          // Si la compra trae un margen, también lo actualiza en el producto.
          await tx
            .update(products)
            .set({
              costUsd: d.unitCostUsd.toString(),
              ...(d.markupPct !== undefined && { markupPct: d.markupPct.toString() }),
              updatedAt: new Date(),
            })
            .where(eq(products.id, d.productId));
        }

        return purchase.id;
      }),
  );

  // getById fuera de la transacción: ya commiteada, visible en la conexión global.
  return getById(purchaseId);
}

export async function list(f: PurchaseFilters) {
  const conditions: SQL[] = [];
  if (f.supplierId) conditions.push(eq(purchases.supplierId, f.supplierId));
  if (f.from) conditions.push(gte(purchases.purchaseDate, new Date(`${f.from}T00:00:00`)));
  if (f.to) conditions.push(lte(purchases.purchaseDate, new Date(`${f.to}T23:59:59`)));
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (f.page - 1) * f.limit;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        userId: purchases.userId,
        invoiceNumber: purchases.invoiceNumber,
        purchaseDate: purchases.purchaseDate,
        exchangeRate: purchases.exchangeRate,
        totalUsd: purchases.totalUsd,
        totalBs: purchases.totalBs,
        notes: purchases.notes,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(where)
      .orderBy(desc(purchases.purchaseDate), desc(purchases.id))
      .limit(f.limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(purchases).where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}

export async function getById(id: number) {
  const [purchase] = await db
    .select({
      id: purchases.id,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
      userId: purchases.userId,
      invoiceNumber: purchases.invoiceNumber,
      purchaseDate: purchases.purchaseDate,
      exchangeRate: purchases.exchangeRate,
      totalUsd: purchases.totalUsd,
      totalBs: purchases.totalBs,
      notes: purchases.notes,
      createdAt: purchases.createdAt,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(eq(purchases.id, id));
  if (!purchase) throw notFound('Compra no encontrada');

  const details = await db
    .select({
      id: purchaseDetails.id,
      productId: purchaseDetails.productId,
      productCode: products.code,
      productName: products.name,
      quantity: purchaseDetails.quantity,
      unitCostUsd: purchaseDetails.unitCostUsd,
      subtotalUsd: purchaseDetails.subtotalUsd,
    })
    .from(purchaseDetails)
    .innerJoin(products, eq(purchaseDetails.productId, products.id))
    .where(eq(purchaseDetails.purchaseId, id));

  return { ...purchase, details };
}
