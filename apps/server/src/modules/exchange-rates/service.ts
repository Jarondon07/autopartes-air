import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  CreateExchangeRateInput,
  ExchangeRateSource,
} from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { exchangeRates } from '../../db/schema';
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

/** Última tasa vigente para cada fuente (BCV y paralelo). */
export async function current() {
  const [bcv, paralelo] = await Promise.all([
    latestForSource('bcv'),
    latestForSource('paralelo'),
  ]);
  return { bcv, paralelo };
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
