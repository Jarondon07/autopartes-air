/**
 * Worker de tasas automáticas (Radar → PostgreSQL).
 *
 * Adaptación del sistema documentado: en lugar de un contenedor Docker con
 * Prisma, corre como un job in-process en el server (setInterval) usando Drizzle
 * y nuestra tabla `exchange_rates`.
 *
 * Cada ciclo hace UNA consulta a Radar y hace UPSERT de las 4 tasas del día:
 *   - bcv          → Radar source "bcv",                    USD/VES
 *   - euro         → Radar source "bcv",                    EUR/VES
 *   - intervencion → Radar source "intervencion_cambiaria", USD/VES
 *   - usdt         → Radar source "binance_p2p",            USDT/VES
 *
 * Las tasas automáticas se guardan con `createdBy = null` (las manuales llevan
 * el id del usuario). Es resiliente: los errores se registran y se reintentan.
 */

import { and, eq } from 'drizzle-orm';
import type { ExchangeRateSource } from '@autopartes-air/shared';
import { db } from '../../infra/db';
import { exchangeRates } from '../../db/schema';
import { env } from '../../infra/env';

interface RadarRate {
  source?: string;
  baseCurrency?: string;
  quoteCurrency?: string;
  midRate?: string | number;
}

/** Mapeo de cada fuente nuestra a su entrada en la respuesta de Radar. */
const RADAR_MAP: {
  source: ExchangeRateSource;
  radarSource: string;
  base: string;
}[] = [
  { source: 'bcv', radarSource: 'bcv', base: 'USD' },
  { source: 'euro', radarSource: 'bcv', base: 'EUR' },
  { source: 'intervencion', radarSource: 'intervencion_cambiaria', base: 'USD' },
  { source: 'usdt', radarSource: 'binance_p2p', base: 'USDT' },
];

/** Fecha local en formato YYYY-MM-DD (evita el corrimiento de UTC). */
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Consulta Radar y devuelve el array de tasas (tolera { rates } o array plano). */
async function fetchRadarRates(): Promise<RadarRate[]> {
  const res = await fetch(env.RADAR_API_URL, {
    headers: { Authorization: `Bearer ${env.RADAR_API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Radar respondió ${res.status}`);

  const data: unknown = await res.json();
  if (Array.isArray(data)) return data as RadarRate[];
  const rates = (data as { rates?: unknown })?.rates;
  return Array.isArray(rates) ? (rates as RadarRate[]) : [];
}

/** Extrae una tasa (VES) del array de Radar por fuente y moneda base. */
function extractRate(rates: RadarRate[], radarSource: string, base: string): number | null {
  const entry = rates.find(
    (r) => r.source === radarSource && r.baseCurrency === base && r.quoteCurrency === 'VES',
  );
  if (!entry) return null;
  const mid =
    typeof entry.midRate === 'string' ? Number.parseFloat(entry.midRate) : entry.midRate;
  return typeof mid === 'number' && Number.isFinite(mid)
    ? Math.round(mid * 10_000) / 10_000
    : null;
}

/** UPSERT de la tasa del día para una fuente; devuelve true si cambió. */
async function upsertRate(source: ExchangeRateSource, rate: number): Promise<boolean> {
  const rateDate = todayLocal();
  const [current] = await db
    .select()
    .from(exchangeRates)
    .where(and(eq(exchangeRates.rateDate, rateDate), eq(exchangeRates.source, source)));

  if (current && Number(current.rateBsPerUsd) === rate) return false; // sin cambios

  await db
    .insert(exchangeRates)
    .values({ rateDate, source, rateBsPerUsd: rate.toString(), createdBy: null })
    .onConflictDoUpdate({
      target: [exchangeRates.rateDate, exchangeRates.source],
      set: { rateBsPerUsd: rate.toString(), createdBy: null, createdAt: new Date() },
    });
  return true;
}

/** Un ciclo del job: consulta Radar y actualiza las 4 tasas del día. */
export async function fetchRatesJob(): Promise<void> {
  try {
    const rates = await fetchRadarRates();
    const updated: string[] = [];

    for (const { source, radarSource, base } of RADAR_MAP) {
      const rate = extractRate(rates, radarSource, base);
      if (rate == null) {
        console.warn(`[tasas] Radar no devolvió ${source} (${base}/VES).`);
        continue;
      }
      if (await upsertRate(source, rate)) updated.push(`${source}=${rate}`);
    }

    if (updated.length) console.log(`[tasas] Actualizadas: ${updated.join(', ')}.`);
  } catch (err) {
    console.error('[tasas] Error al consultar Radar:', err instanceof Error ? err.message : err);
  }
}

/** Arranca el worker si hay RADAR_API_KEY; si no, queda solo la carga manual. */
export function startRatesWorker(): void {
  if (!env.RADAR_API_KEY) {
    console.log('ℹ️  Worker de tasas deshabilitado (define RADAR_API_KEY para activarlo).');
    return;
  }
  const minutes = Math.round(env.BCV_FETCH_INTERVAL_MS / 60_000);
  console.log(`🔄 Worker de tasas activo: consulta cada ${minutes} min.`);
  void fetchRatesJob();
  setInterval(() => void fetchRatesJob(), env.BCV_FETCH_INTERVAL_MS);
}
