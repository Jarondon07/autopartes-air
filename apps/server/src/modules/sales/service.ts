import { and, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm';
import { round2, type CreateSaleInput, type SaleFilters } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { clients, products, saleDetails, salePayments, sales } from '../../db/schema';
import { badRequest, conflict, notFound } from '../../middleware/error';
import { withForeignKeyGuard } from '../../lib/db-errors';
import { applyStockChange } from '../inventory/service';
import { getBcvRate } from '../exchange-rates/service';
import { getAppliedRate } from '../taxes/service';

/**
 * Registra una venta (factura):
 *  - resuelve el precio de cada renglón (el vigente del producto o uno dado),
 *  - calcula subtotal + IVA + totales USD/Bs con snapshot de la tasa BCV,
 *  - descuenta stock y registra movimiento 'venta' por cada renglón.
 */
export async function create(input: CreateSaleInput, userId: number) {
  const rate = await getBcvRate();
  // El IVA solo se aplica si la venta lo pide (check del cajero); por defecto NO.
  const ivaPct = input.applyIva ? await getAppliedRate() : 0;

  // Precios vigentes de los productos involucrados.
  const ids = input.details.map((d) => d.productId);
  const prods = await db
    .select({ id: products.id, priceUsd: products.priceUsd })
    .from(products)
    .where(inArray(products.id, ids));
  const priceMap = new Map(prods.map((p) => [p.id, Number(p.priceUsd)]));

  const details = input.details.map((d) => {
    const price = d.unitPriceUsd ?? priceMap.get(d.productId);
    if (price == null) throw notFound(`Producto ${d.productId} no encontrado`);
    return { ...d, unitPriceUsd: price, subtotalUsd: round2(d.quantity * price) };
  });

  const subtotalUsd = round2(details.reduce((s, d) => s + d.subtotalUsd, 0));
  const ivaUsd = round2((subtotalUsd * ivaPct) / 100);
  const totalUsd = round2(subtotalUsd + ivaUsd);
  const totalBs = round2(totalUsd * rate);

  const paidUsd = round2(input.payments.reduce((s, p) => s + p.amountUsd, 0));
  if (input.isCredit) {
    // A crédito el pago es un abono inicial (puede ser cero); lo que no se
    // cubra queda como deuda. Lo único inválido es pagar de más.
    if (paidUsd - totalUsd > 0.01) {
      throw badRequest(`El abono inicial (${paidUsd}) supera el total de la venta (${totalUsd}).`);
    }
  } else if (Math.abs(paidUsd - totalUsd) > 0.01) {
    // De contado el desglose tiene que cuadrar exactamente.
    throw badRequest(`El desglose de pago (${paidUsd}) no cuadra con el total (${totalUsd}).`);
  }

  const saleId = await withForeignKeyGuard('Cliente o producto inexistente', () =>
    db.transaction(async (tx) => {
      const [sale] = await tx
        .insert(sales)
        .values({
          clientId: input.clientId ?? null,
          userId,
          exchangeRate: rate.toString(),
          subtotalUsd: subtotalUsd.toString(),
          ivaPct: ivaPct.toString(),
          ivaUsd: ivaUsd.toString(),
          totalUsd: totalUsd.toString(),
          totalBs: totalBs.toString(),
          paymentMethods: input.payments.map((p) => p.method),
          isCredit: input.isCredit ?? false,
          dueDate: input.isCredit ? input.dueDate ?? null : null,
          notes: input.notes ?? null,
        })
        .returning();
      if (!sale) throw new Error('No se pudo crear la venta');

      for (const p of input.payments) {
        const amountBs = p.amountBs ?? 0;
        await tx.insert(salePayments).values({
          saleId: sale.id,
          method: p.method,
          amountUsd: p.amountUsd.toString(),
          amountBs: amountBs.toString(),
          userId,
          // Solo tiene sentido guardar tasa si de verdad se cobró en bolívares.
          exchangeRate: amountBs > 0 ? round2(amountBs / p.amountUsd).toString() : null,
        });
      }

      for (const d of details) {
        await tx.insert(saleDetails).values({
          saleId: sale.id,
          productId: d.productId,
          quantity: d.quantity,
          unitPriceUsd: d.unitPriceUsd.toString(),
          subtotalUsd: d.subtotalUsd.toString(),
        });
        // Descuenta stock (cantidad negativa) + movimiento 'venta'.
        await applyStockChange(tx, {
          productId: d.productId,
          quantity: -d.quantity,
          movementType: 'venta',
          userId,
          referenceType: 'sale',
          referenceId: sale.id,
        });
      }

      return sale.id;
    }),
  );

  return getById(saleId);
}

/** Anula una venta: revierte stock (movimiento 'anulacion') y marca el estado. */
export async function voidSale(id: number, userId: number) {
  const [sale] = await db.select().from(sales).where(eq(sales.id, id));
  if (!sale) throw notFound('Venta no encontrada');
  if (sale.status === 'anulada') throw conflict('La venta ya está anulada');

  // Una venta a crédito con abonos ya movió dinero: revertirla en silencio
  // descuadraría la caja. Se bloquea y se resuelve devolviendo el dinero.
  if (sale.isCredit) {
    const [paid] = await db
      .select({ total: sql<string>`COALESCE(SUM(${salePayments.amountUsd}), 0)` })
      .from(salePayments)
      .where(eq(salePayments.saleId, id));
    if (Number(paid?.total ?? 0) > 0) {
      throw conflict(
        'La venta a crédito tiene abonos registrados: devuelve el dinero al cliente y registra la devolución antes de anularla.',
      );
    }
  }

  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(saleDetails)
      .where(eq(saleDetails.saleId, id));

    for (const d of rows) {
      await applyStockChange(tx, {
        productId: d.productId,
        quantity: d.quantity, // devuelve al stock
        movementType: 'anulacion',
        userId,
        referenceType: 'sale',
        referenceId: id,
      });
    }

    await tx
      .update(sales)
      .set({ status: 'anulada', voidedAt: new Date(), voidedBy: userId })
      .where(eq(sales.id, id));
  });

  return getById(id);
}

export async function list(f: SaleFilters) {
  const conditions: SQL[] = [];
  if (f.clientId) conditions.push(eq(sales.clientId, f.clientId));
  if (f.userId) conditions.push(eq(sales.userId, f.userId));
  if (f.status) conditions.push(eq(sales.status, f.status));
  if (f.from) conditions.push(gte(sales.saleDate, new Date(`${f.from}T00:00:00`)));
  if (f.to) conditions.push(lte(sales.saleDate, new Date(`${f.to}T23:59:59`)));
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (f.page - 1) * f.limit;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: sales.id,
        clientId: sales.clientId,
        clientName: clients.name,
        userId: sales.userId,
        saleDate: sales.saleDate,
        exchangeRate: sales.exchangeRate,
        subtotalUsd: sales.subtotalUsd,
        ivaUsd: sales.ivaUsd,
        totalUsd: sales.totalUsd,
        totalBs: sales.totalBs,
        paymentMethods: sales.paymentMethods,
        status: sales.status,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .leftJoin(clients, eq(sales.clientId, clients.id))
      .where(where)
      .orderBy(desc(sales.saleDate), desc(sales.id))
      .limit(f.limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(sales).where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}

/** Resumen agregado (conteo + suma USD/Bs) en SQL, sin traer filas. */
export async function summary(f: {
  from?: string;
  to?: string;
  status?: 'completada' | 'anulada';
  userId?: number;
}) {
  const conditions: SQL[] = [];
  if (f.userId) conditions.push(eq(sales.userId, f.userId));
  if (f.status) conditions.push(eq(sales.status, f.status));
  if (f.from) conditions.push(gte(sales.saleDate, new Date(`${f.from}T00:00:00`)));
  if (f.to) conditions.push(lte(sales.saleDate, new Date(`${f.to}T23:59:59`)));
  const where = conditions.length ? and(...conditions) : undefined;

  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalUsd: sql<number>`coalesce(sum(${sales.totalUsd}), 0)::float`,
      totalBs: sql<number>`coalesce(sum(${sales.totalBs}), 0)::float`,
    })
    .from(sales)
    .where(where);

  return {
    count: row?.count ?? 0,
    totalUsd: row?.totalUsd ?? 0,
    totalBs: row?.totalBs ?? 0,
  };
}

export async function getById(id: number) {
  const [sale] = await db
    .select({
      id: sales.id,
      clientId: sales.clientId,
      clientName: clients.name,
      userId: sales.userId,
      saleDate: sales.saleDate,
      exchangeRate: sales.exchangeRate,
      subtotalUsd: sales.subtotalUsd,
      ivaPct: sales.ivaPct,
      ivaUsd: sales.ivaUsd,
      totalUsd: sales.totalUsd,
      totalBs: sales.totalBs,
      paymentMethods: sales.paymentMethods,
      isCredit: sales.isCredit,
      dueDate: sales.dueDate,
      status: sales.status,
      voidedAt: sales.voidedAt,
      notes: sales.notes,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(eq(sales.id, id));
  if (!sale) throw notFound('Venta no encontrada');

  const details = await db
    .select({
      id: saleDetails.id,
      productId: saleDetails.productId,
      productCode: products.code,
      productName: products.name,
      quantity: saleDetails.quantity,
      unitPriceUsd: saleDetails.unitPriceUsd,
      subtotalUsd: saleDetails.subtotalUsd,
    })
    .from(saleDetails)
    .innerJoin(products, eq(saleDetails.productId, products.id))
    .where(eq(saleDetails.saleId, id));

  const payments = await db
    .select({
      method: salePayments.method,
      amountUsd: salePayments.amountUsd,
      amountBs: salePayments.amountBs,
    })
    .from(salePayments)
    .where(eq(salePayments.saleId, id));

  return { ...sale, details, payments };
}
