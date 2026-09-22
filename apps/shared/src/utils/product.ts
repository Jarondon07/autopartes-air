/** Separador entre el nombre del producto y su marca. */
const BRAND_SEP = ' · ';

/**
 * Nombre del producto con su marca: `Evaporador · Delphi`.
 *
 * El catálogo tiene muchos productos con el mismo nombre ("Evaporador",
 * "Condensador", "Filtro") y lo que los distingue en el mostrador es la marca.
 * Mostrar solo el nombre obliga a abrir la ficha para saber cuál es cuál.
 *
 * Sin marca (productos que aún no la tienen) devuelve el nombre a secas, sin
 * separador colgando.
 */
export function formatProductName(name: string, brandName?: string | null): string {
  const brand = brandName?.trim();
  return brand ? `${name}${BRAND_SEP}${brand}` : name;
}
