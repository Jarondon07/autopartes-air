import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import {
  EXCHANGE_RATE_SOURCES,
  type CreateExchangeRateInput,
  type ExchangeRateSource,
} from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { exchangeRates } from '../../db/schema';
import { env } from '../../infra/env';
import { withUniqueGuard } from '../../lib/db-errors';

const DUP = 'Ya existe una tasa registrada para esa fecha y fuente';

async function latestForSource(source: ExchangeRateSource) {
  const [row] = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.source, source))
    .orderBy(desc(exchangeRates.rateDate), desc(exchangeRates.id))
    .limit(1);
  return row ?? null;
}

/** Última tasa vigente para cada una de las fuentes configuradas. */
export async function current() {
  const entries = await Promise.all(
    EXCHANGE_RATE_SOURCES.map(
      async (source) => [source, await latestForSource(source)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<
    ExchangeRateSource,
    Awaited<ReturnType<typeof latestForSource>>
  >;
}

/**
 * Tasa BCV vigente como número, con fallback de emergencia si no hay ninguna
 * registrada (útil para cálculos de ventas/compras). Ver BCV_FALLBACK_RATE.
 */
export async function getBcvRate(): Promise<number> {
  const row = await latestForSource('bcv');
  return row ? Number(row.rateBsPerUsd) : env.BCV_FALLBACK_RATE;
}

interface ListParams {
  page: number;
  limit: number;
  source?: ExchangeRateSource;
}

export async function list({ page, limit, source }: ListParams) {
  const conditions: SQL[] = [];
  if (source) conditions.push(eq(exchangeRates.source, source));
  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(exchangeRates)
      .where(where)
      .orderBy(desc(exchangeRates.rateDate), desc(exchangeRates.id))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(exchangeRates).where(where),
  ]);

  return { rows, total: countResult[0]?.count ?? 0 };
}

export function create(input: CreateExchangeRateInput, userId: number) {
  return withUniqueGuard(DUP, async () => {
    const [row] = await db
      .insert(exchangeRates)
      .values({
        rateDate: input.rateDate,
        source: input.source,
        rateBsPerUsd: input.rateBsPerUsd.toString(),
        createdBy: userId,
      })
      .returning();
    return row;
  });
}
