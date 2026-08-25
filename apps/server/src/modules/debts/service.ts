import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import {
  PAYMENT_METHOD_CURRENCY,
  round2,
  type AddDebtPaymentInput,
  type DebtFilters,
  type PaymentMethod,
} from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { clients, salePayments, sales, users } from '../../db/schema';
import { badRequest, conflict, notFound } from '../../middleware/error';
import { current } from '../exchange-rates/service';

/**
 * Deudas = ventas a crédito con saldo.
 *
 * Ni el saldo ni el estado se guardan: se calculan. Un saldo almacenado se
 * desincroniza en cuanto algo falle a mitad de una operación, y el estado
 * "vencida" cambia solo con el paso del tiempo, sin que nadie toque la fila.
 */

/** Suma abonada por venta, como subconsulta reutilizable. */
const paidUsdSql = sql<string>`COALESCE((
  SELECT SUM(${salePayments.amountUsd})
    FROM ${salePayments}
   WHERE ${salePayments.saleId} = ${sales.id}
), 0)`;

const balanceUsdSql = sql<string>`(${sales.totalUsd} - ${paidUsdSql})`;

/** Estado derivado del saldo y la fecha de pago. */
const statusSql = sql<string>`CASE
  WHEN ${balanceUsdSql} <= 0.01 THEN 'pagada'
  WHEN ${sales.dueDate} IS NOT NULL AND ${sales.dueDate} < CURRENT_DATE THEN 'vencida'
  WHEN ${paidUsdSql} > 0 THEN 'parcial'
  ELSE 'pendiente'
END`;

/** Días de atraso; 0 si aún no vence. */
const daysOverdueSql = sql<number>`GREATEST(0, COALESCE(CURRENT_DATE - ${sales.dueDate}, 0))::int`;

const debtColumns = {
  saleId: sales.id,
  clientId: sales.clientId,
  clientName: clients.name,
  userId: sales.userId,
  saleDate: sales.saleDate,
  dueDate: sales.dueDate,
  totalUsd: sales.totalUsd,
  paidUsd: paidUsdSql,
  balanceUsd: balanceUsdSql,
  status: statusSql,
  daysOverdue: daysOverdueSql,
  notes: sales.notes,
};

/** Condiciones base: solo ventas a crédito vigentes (una anulada no se cobra). */
function baseConditions(): SQL[] {
  return [eq(sales.isCredit, true), eq(sales.status, 'completada')];
}

export async function list(f: DebtFilters) {
  const conditions = baseConditions();
  if (f.clientId) conditions.push(eq(sales.clientId, f.clientId));
  if (f.from) conditions.push(gte(sales.saleDate, new Date(`${f.from}T00:00:00`)));
  if (f.to) conditions.push(lte(sales.saleDate, new Date(`${f.to}T23:59:59`)));
  if (f.overdue) {
    conditions.push(sql`${sales.dueDate} < CURRENT_DATE AND ${balanceUsdSql} > 0.01`);
  }
  // El estado es una expresión, no una columna: se filtra por la misma fórmula.
  if (f.status) conditions.push(sql`${statusSql} = ${f.status}`);

  const where = and(...conditions);
  const offset = (f.page - 1) * f.limit;

  const [rows, countResult] = await Promise.all([
    db
      .select(debtColumns)
      .from(sales)
      .leftJoin(clients, eq(sales.clientId, clients.id))
      // Las que ya vencieron primero, y dentro de ellas la más atrasada arriba.
      .orderBy(asc(sales.dueDate), desc(sales.id))
      .where(where)
      .limit(f.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sales)
      .leftJoin(clients, eq(sales.clientId, clients.id))
      .where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}

/** Totales por cobrar y vencido, agregados en SQL. */
export async function summary(clientId?: number) {
  const conditions = baseConditions();
  conditions.push(sql`${balanceUsdSql} > 0.01`);
  if (clientId) conditions.push(eq(sales.clientId, clientId));

  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalBalanceUsd: sql<string>`COALESCE(SUM(${balanceUsdSql}), 0)::text`,
      overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${sales.dueDate} < CURRENT_DATE)::int`,
      overdueBalanceUsd: sql<string>`COALESCE(SUM(${balanceUsdSql}) FILTER (WHERE ${sales.dueDate} < CURRENT_DATE), 0)::text`,
    })
    .from(sales)
    .where(and(...conditions));

  return (
    row ?? { count: 0, totalBalanceUsd: '0', overdueCount: 0, overdueBalanceUsd: '0' }
  );
}

/** Deuda con sus abonos, del más antiguo al más reciente. */
export async function getById(saleId: number) {
  const [debt] = await db
    .select(debtColumns)
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(and(eq(sales.id, saleId), eq(sales.isCredit, true)));
  if (!debt) throw notFound('Deuda no encontrada');

  const payments = await db
    .select({
      id: salePayments.id,
      saleId: salePayments.saleId,
      method: salePayments.method,
      amountUsd: salePayments.amountUsd,
      amountBs: salePayments.amountBs,
      paidAt: salePayments.paidAt,
      exchangeRate: salePayments.exchangeRate,
      userId: salePayments.userId,
      userName: users.fullName,
      notes: salePayments.notes,
    })
    .from(salePayments)
    .leftJoin(users, eq(salePayments.userId, users.id))
    .where(eq(salePayments.saleId, saleId))
    .orderBy(asc(salePayments.paidAt), asc(salePayments.id));

  return { ...debt, payments };
}

/** Saldo pendiente de una venta, leído dentro de la transacción que lo va a usar. */
async function balanceOf(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  saleId: number,
): Promise<number> {
  const [row] = await tx
    .select({ balance: sql<string>`${sales.totalUsd} - ${paidUsdSql}` })
    .from(sales)
    .where(eq(sales.id, saleId));
  return round2(Number(row?.balance ?? 0));
}

/**
 * Registra un abono contra una deuda.
 *
 * El saldo se relee **dentro de la transacción**: entre que la pantalla lo
 * mostró y el cajero confirmó, otro pudo haber abonado.
 */
export async function addPayment(
  saleId: number,
  input: AddDebtPaymentInput,
  userId: number,
) {
  const [sale] = await db.select().from(sales).where(eq(sales.id, saleId));
  if (!sale) throw notFound('Venta no encontrada');
  if (!sale.isCredit) throw badRequest('Esta venta no es a crédito');
  if (sale.status === 'anulada') throw conflict('La venta está anulada');

  // Los métodos en bolívares se convierten con la tasa USDT del día del abono,
  // la misma convención del cajero. La tasa se guarda en la fila: así el
  // registro no depende de qué tasa esté vigente cuando se consulte después.
  const isBs = PAYMENT_METHOD_CURRENCY[input.method as PaymentMethod] === 'BS';
  let rate: number | null = null;
  if (isBs) {
    const rates = await current();
    rate = Number(rates.usdt?.rateBsPerUsd ?? 0);
    if (!rate) throw badRequest('No hay tasa USDT registrada para convertir a bolívares');
  }

  await db.transaction(async (tx) => {
    const balance = await balanceOf(tx, saleId);
    if (balance <= 0.01) throw conflict('Esta deuda ya está saldada');
    if (input.amountUsd - balance > 0.01) {
      throw badRequest(`El abono (${input.amountUsd}) supera el saldo pendiente (${balance}).`);
    }

    await tx.insert(salePayments).values({
      saleId,
      method: input.method,
      amountUsd: input.amountUsd.toString(),
      amountBs: rate ? round2(input.amountUsd * rate).toString() : '0',
      exchangeRate: rate ? rate.toString() : null,
      userId,
      notes: input.notes ?? null,
    });

    // `paymentMethods` de la venta lleva los métodos usados hasta ahora.
    if (!sale.paymentMethods.includes(input.method)) {
      await tx
        .update(sales)
        .set({ paymentMethods: [...sale.paymentMethods, input.method] })
        .where(eq(sales.id, saleId));
    }
  });

  return getById(saleId);
}
