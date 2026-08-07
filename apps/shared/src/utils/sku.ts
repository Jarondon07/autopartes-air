/**
 * Genera el código (SKU) de un producto:
 *   [abrev. categoría][abrev. marca del carro]-[número de pieza]
 * Ej: Evaporador (EVA) + Volkswagen (VW) + "905" → "EVAVW-905".
 * Si falta alguna abreviatura, se omite esa parte.
 */
export function buildProductSku(
  categoryAbbr: string | null | undefined,
  carBrandAbbr: string | null | undefined,
  partNumber: string,
): string {
  const cat = (categoryAbbr ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const car = (carBrandAbbr ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const pn = partNumber.trim();
  const prefix = `${cat}${car}`;
  return prefix ? `${prefix}-${pn}` : pn;
}
