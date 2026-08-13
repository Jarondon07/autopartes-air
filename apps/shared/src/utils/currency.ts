/**
 * Utilidades de moneda. Todos los montos se manejan como números con 2
 * decimales (los cálculos críticos viven en la BD como NUMERIC(14,2);
 * estas funciones son para presentación y cálculos de UI).
 */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Precio de venta a partir de costo y % de markup.
 * Se redondea SIEMPRE hacia arriba a dólar entero (ej. 12,35 → 13,00).
 */
export function calcPriceUsd(costUsd: number, markupPct: number): number {
  return Math.ceil(costUsd * (1 + markupPct / 100));
}

export function usdToBs(amountUsd: number, rateBsPerUsd: number): number {
  return round2(amountUsd * rateBsPerUsd);
}

export function bsToUsd(amountBs: number, rateBsPerUsd: number): number {
  if (rateBsPerUsd === 0) return 0;
  return round2(amountBs / rateBsPerUsd);
}

const usdFormatter = new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const bsFormatter = new Intl.NumberFormat('es-VE', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}

export function formatBs(amount: number): string {
  return `Bs. ${bsFormatter.format(amount)}`;
}
