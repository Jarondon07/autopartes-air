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

/**
 * El camino inverso: qué margen hay que guardar para que el producto se venda
 * a `priceUsd`. Sirve para que en pantalla se pueda escribir directamente el
 * precio ("este evaporador ahora vale 80") sin calcular el porcentaje.
 *
 * El margen se despeja y luego se corrige, porque `calcPriceUsd` redondea
 * hacia arriba a dólar entero: el porcentaje exacto puede caer un centavo por
 * debajo del escalón y dar un dólar de menos. Se ajusta de a 0,01 % hasta que
 * la fórmula devuelva justo el precio pedido.
 */
export function calcMarkupPct(costUsd: number, priceUsd: number): number {
  // Sin costo no hay margen que despejar (el producto aún no tiene compras).
  if (costUsd <= 0) return 0;

  let markup = round2((priceUsd / costUsd - 1) * 100);
  if (markup < 0) markup = 0;

  // Como mucho unos pocos pasos: el error de redondeo es de centésimas.
  for (let i = 0; i < 200 && calcPriceUsd(costUsd, markup) < priceUsd; i++) {
    markup = round2(markup + 0.01);
  }
  for (let i = 0; i < 200 && markup > 0 && calcPriceUsd(costUsd, round2(markup - 0.01)) >= priceUsd; i++) {
    markup = round2(markup - 0.01);
  }
  return markup;
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
