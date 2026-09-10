import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import type { ReportRange } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { products, saleDetails, salePayments, sales } from '../../db/schema';

/** Condiciones comunes: ventas completadas dentro del rango de fechas. */
function saleRangeConditions(f: ReportRange): SQL[] {
  const conditions: SQL[] = [eq(sales.status, 'completada')];
  if (f.from) conditions.push(gte(sales.saleDate, new Date(`${f.from}T00:00:00`)));
  if (f.to) conditions.push(lte(sales.saleDate, new Date(`${f.to}T23:59:59`)));
  return conditions;
}

/** Ventas agrupadas por día (para tendencia). */
export async function salesByDay(f: ReportRange) {
  const dateExpr = sql<string>`to_char(${sales.saleDate}, 'YYYY-MM-DD')`;
  return db
    .select({
      date: dateExpr,
      count: sql<number>`count(*)::int`,
      totalUsd: sql<number>`coalesce(sum(${sales.totalUsd}), 0)::float`,
      totalBs: sql<number>`coalesce(sum(${sales.totalBs}), 0)::float`,
    })
    .from(sales)
    .where(and(...saleRangeConditions(f)))
    .groupBy(dateExpr)
    .orderBy(dateExpr);
}

/** Productos más vendidos (por monto USD) en el rango. */
export async function topProducts(f: ReportRange) {
  return db
    .select({
      productId: saleDetails.productId,
      code: products.code,
      name: products.name,
      quantity: sql<number>`sum(${saleDetails.quantity})::int`,
      totalUsd: sql<number>`coalesce(sum(${saleDetails.subtotalUsd}), 0)::float`,
    })
    .from(saleDetails)
    .innerJoin(sales, eq(sales.id, saleDetails.saleId))
    .innerJoin(products, eq(products.id, saleDetails.productId))
    .where(and(...saleRangeConditions(f)))
    .groupBy(saleDetails.productId, products.code, products.name)
    .orderBy(desc(sql`sum(${saleDetails.subtotalUsd})`))
    .limit(f.limit);
}

/** Cuadre por método de pago (USD cobrado y Bs cobrado) en el rango. */
export async function salesByPayment(f: ReportRange) {
  return db
    .select({
      method: salePayments.method,
      count: sql<number>`count(*)::int`,
      amountUsd: sql<number>`coalesce(sum(${salePayments.amountUsd}), 0)::float`,
      amountBs: sql<number>`coalesce(sum(${salePayments.amountBs}), 0)::float`,
    })
    .from(salePayments)
    .innerJoin(sales, eq(sales.id, salePayments.saleId))
    .where(and(...saleRangeConditions(f)))
    .groupBy(salePayments.method)
    .orderBy(desc(sql`sum(${salePayments.amountUsd})`));
}

/** Resumen de inventario: unidades y valorización a costo y a precio de venta. */
export async function inventorySummary() {
  const [row] = await db
    .select({
      activeProducts: sql<number>`count(*)::int`,
      totalUnits: sql<number>`coalesce(sum(${products.stock}), 0)::int`,
      costUsd: sql<number>`coalesce(sum(${products.stock} * ${products.costUsd}), 0)::float`,
      priceUsd: sql<number>`coalesce(sum(${products.stock} * ${products.priceUsd}), 0)::float`,
    })
    .from(products)
    .where(eq(products.isActive, true));

  return {
    activeProducts: row?.activeProducts ?? 0,
    totalUnits: row?.totalUnits ?? 0,
    costUsd: row?.costUsd ?? 0,
    priceUsd: row?.priceUsd ?? 0,
  };
}
