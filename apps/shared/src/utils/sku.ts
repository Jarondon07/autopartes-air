/**
 * Abreviatura que ocupa el lugar de la marca del carro en los productos
 * universales (gas refrigerante, aceites, limpiadores): sirven para cualquier
 * vehículo, así que no hay una marca que representar.
 */
export const UNIVERSAL_CAR_ABBR = 'UNIV';

/**
 * Genera el código (SKU) de un producto:
 *   [abrev. categoría][abrev. marca del carro]-[número de pieza]
 * Ej: Evaporador (EVA) + Volkswagen (VW) + "905" → "EVAVW-905".
 * Universal: Refrigerantes (REF) + UNIV + "134a" → "REFUNIV-134a".
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
