import type { Category } from '@autopartes-air/shared';

interface CatOption {
  value: number;
  label: string;
}

/** Código visible de una categoría, derivado de su id: CAT-000001. */
export function formatCategoryCode(id: number): string {
  return `CAT-${String(id).padStart(6, '0')}`;
}

/** Opciones de categoría para asignar/filtrar productos (lista plana). */
export function categoryOptions(categories: Category[]): CatOption[] {
  return categories.map((c) => ({
    value: c.id,
    label: `${formatCategoryCode(c.id)} · ${c.name}`,
  }));
}
