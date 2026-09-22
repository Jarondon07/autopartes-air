import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import type { ReportRange } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import {
  products,
  purchaseDetails,
  purchases,
  saleDetails,
  salePayments,
  sales,
  suppliers,
} from '../../db/schema';

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

// --- Inversión y ganancia -------------------------------------------------

/** Condiciones de rango para compras (no tienen estado: todas cuentan). */
function purchaseRangeConditions(f: ReportRange): SQL[] {
  const conditions: SQL[] = [];
  if (f.from) conditions.push(gte(purchases.purchaseDate, new Date(`${f.from}T00:00:00`)));
  if (f.to) conditions.push(lte(purchases.purchaseDate, new Date(`${f.to}T23:59:59`)));
  return conditions;
}

/**
 * Inversión del período: cuánto se pagó en compras, en total y por proveedor.
 *
 * Es dinero que salió, no el valor del inventario: lo comprado este mes puede
 * estar ya vendido. El capital parado se ve en `inventorySummary`.
 */
export async function purchasesSummary(f: ReportRange) {
  const where = purchaseRangeConditions(f);
  const filter = where.length ? and(...where) : undefined;

  const [totals, bySupplier] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)::int`,
        totalUsd: sql<number>`coalesce(sum(${purchases.totalUsd}), 0)::float`,
        totalBs: sql<number>`coalesce(sum(${purchases.totalBs}), 0)::float`,
      })
      .from(purchases)
      .where(filter),
    db
      .select({
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        count: sql<number>`count(distinct ${purchases.id})::int`,
        units: sql<number>`coalesce(sum(${purchaseDetails.quantity}), 0)::int`,
        totalUsd: sql<number>`coalesce(sum(${purchaseDetails.subtotalUsd}), 0)::float`,
      })
      .from(purchases)
      .innerJoin(suppliers, eq(suppliers.id, purchases.supplierId))
      .innerJoin(purchaseDetails, eq(purchaseDetails.purchaseId, purchases.id))
      .where(filter)
      .groupBy(purchases.supplierId, suppliers.name)
      .orderBy(desc(sql`sum(${purchaseDetails.subtotalUsd})`)),
  ]);

  return {
    count: totals[0]?.count ?? 0,
    totalUsd: totals[0]?.totalUsd ?? 0,
    totalBs: totals[0]?.totalBs ?? 0,
    bySupplier,
  };
}

/**
 * Costo de lo vendido: el costo congelado en el renglón y, si la venta es
 * anterior a esa columna, el costo actual del producto (aproximación).
 */
const lineCostUsd = sql`${saleDetails.quantity} * coalesce(${saleDetails.unitCostUsd}, ${products.costUsd})`;

/**
 * Utilidad bruta del período: ingreso (sin IVA, que no es ganancia) menos el
 * costo de la mercancía vendida. Devuelve también el total por día y cuántos
 * renglones se costearon con el costo actual en vez del congelado, para poder
 * decir en pantalla si la cifra es exacta o estimada.
 */
export async function salesProfit(f: ReportRange) {
  const where = and(...saleRangeConditions(f));
  const dateExpr = sql<string>`to_char(${sales.saleDate}, 'YYYY-MM-DD')`;

  const [totals, byDay] = await Promise.all([
    db
      .select({
        lines: sql<number>`count(*)::int`,
        estimatedLines: sql<number>`count(*) filter (where ${saleDetails.unitCostUsd} is null)::int`,
        revenueUsd: sql<number>`coalesce(sum(${saleDetails.subtotalUsd}), 0)::float`,
        costUsd: sql<number>`coalesce(sum(${lineCostUsd}), 0)::float`,
      })
      .from(saleDetails)
      .innerJoin(sales, eq(sales.id, saleDetails.saleId))
      .innerJoin(products, eq(products.id, saleDetails.productId))
      .where(where),
    db
      .select({
        date: dateExpr,
        revenueUsd: sql<number>`coalesce(sum(${saleDetails.subtotalUsd}), 0)::float`,
        costUsd: sql<number>`coalesce(sum(${lineCostUsd}), 0)::float`,
        profitUsd: sql<number>`coalesce(sum(${saleDetails.subtotalUsd} - ${lineCostUsd}), 0)::float`,
      })
      .from(saleDetails)
      .innerJoin(sales, eq(sales.id, saleDetails.saleId))
      .innerJoin(products, eq(products.id, saleDetails.productId))
      .where(where)
      .groupBy(dateExpr)
      .orderBy(dateExpr),
  ]);

  const revenueUsd = totals[0]?.revenueUsd ?? 0;
  const costUsd = totals[0]?.costUsd ?? 0;
  const profitUsd = revenueUsd - costUsd;

  return {
    revenueUsd,
    costUsd,
    profitUsd,
    // Margen sobre la venta (cuánto de cada dólar facturado queda).
    marginPct: revenueUsd > 0 ? (profitUsd / revenueUsd) * 100 : 0,
    lines: totals[0]?.lines ?? 0,
    estimatedLines: totals[0]?.estimatedLines ?? 0,
    byDay,
  };
}

/** Los productos que más ganancia dejaron en el período (no los más vendidos). */
export async function profitByProduct(f: ReportRange) {
  return db
    .select({
      productId: saleDetails.productId,
      code: products.code,
      name: products.name,
      quantity: sql<number>`sum(${saleDetails.quantity})::int`,
      revenueUsd: sql<number>`coalesce(sum(${saleDetails.subtotalUsd}), 0)::float`,
      costUsd: sql<number>`coalesce(sum(${lineCostUsd}), 0)::float`,
      profitUsd: sql<number>`coalesce(sum(${saleDetails.subtotalUsd} - ${lineCostUsd}), 0)::float`,
    })
    .from(saleDetails)
    .innerJoin(sales, eq(sales.id, saleDetails.saleId))
    .innerJoin(products, eq(products.id, saleDetails.productId))
    .where(and(...saleRangeConditions(f)))
    .groupBy(saleDetails.productId, products.code, products.name)
    .orderBy(desc(sql`sum(${saleDetails.subtotalUsd} - ${lineCostUsd})`))
    .limit(f.limit);
}
