import { and, asc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '../../infra/db';
import {
  brands,
  carBrands,
  carModels,
  categories,
  productCarModels,
  productCategories,
  productImages,
  products,
} from '../../db/schema';
import { searchConditions } from '../products/service';
import { current as currentRates } from '../exchange-rates/service';

/**
 * Catálogo público (sin sesión).
 *
 * Este módulo existe justamente para NO reutilizar el listado interno: aquel
 * devuelve costo, margen, stock exacto y almacén, que no tienen por qué salir
 * a la calle. Aquí se arma a mano lo que sí es público.
 */

export interface CatalogFilters {
  q?: string;
  categoryId?: number;
  carBrandId?: number;
  page: number;
  limit: number;
}

export interface CatalogItem {
  id: number;
  code: string;
  name: string;
  partNumber: string;
  categoryName: string | null;
  brandName: string | null;
  carBrandName: string | null;
  /** Modelos compatibles, ya formateados ("Yaris 2005-2012"). */
  carModels: string[];
  isUniversal: boolean;
  /** Nulo mientras el producto no tenga costo (nunca se le registró una compra). */
  priceUsd: string | null;
  imageUrl: string | null;
  /** Disponibilidad, no cantidad: cuánto queda en el depósito no es público. */
  available: boolean;
}

export async function listCatalog(f: CatalogFilters) {
  // Solo productos activos: la baja lógica saca al producto del catálogo.
  const conditions: SQL[] = [eq(products.isActive, true)];
  if (f.q) conditions.push(...searchConditions(f.q));
  if (f.categoryId) {
    conditions.push(
      inArray(
        products.id,
        db
          .select({ id: productCategories.productId })
          .from(productCategories)
          .where(eq(productCategories.categoryId, f.categoryId)),
      ),
    );
  }
  // Un universal sirve para cualquier marca, así que aparece en todo filtro de marca.
  if (f.carBrandId) {
    conditions.push(
      sql`(${products.carBrandId} = ${f.carBrandId} OR ${products.isUniversal})`,
    );
  }

  const where = and(...conditions);
  const offset = (f.page - 1) * f.limit;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        partNumber: products.partNumber,
        priceUsd: products.priceUsd,
        stock: products.stock,
        isUniversal: products.isUniversal,
        categoryName: categories.name,
        brandName: brands.name,
        carBrandName: carBrands.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(carBrands, eq(products.carBrandId, carBrands.id))
      .where(where)
      .orderBy(asc(products.name))
      .limit(f.limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
  ]);

  const ids = rows.map((r) => r.id);
  const images = new Map<number, string>();
  const models = new Map<number, string[]>();

  if (ids.length) {
    const [imgs, mods] = await Promise.all([
      db
        .select({ productId: productImages.productId, url: productImages.url })
        .from(productImages)
        .where(inArray(productImages.productId, ids))
        .orderBy(asc(productImages.sortOrder)),
      db
        .select({
          productId: productCarModels.productId,
          name: carModels.name,
          yearFrom: productCarModels.yearFrom,
          yearTo: productCarModels.yearTo,
        })
        .from(productCarModels)
        .innerJoin(carModels, eq(carModels.id, productCarModels.carModelId))
        .where(inArray(productCarModels.productId, ids))
        .orderBy(asc(carModels.name)),
    ]);
    // La principal es la de menor sortOrder, que es como vienen ordenadas.
    for (const im of imgs) if (!images.has(im.productId)) images.set(im.productId, im.url);
    for (const m of mods) {
      const years =
        m.yearFrom && m.yearTo
          ? ` ${m.yearFrom}-${m.yearTo}`
          : m.yearFrom
            ? ` desde ${m.yearFrom}`
            : m.yearTo
              ? ` hasta ${m.yearTo}`
              : '';
      const list = models.get(m.productId) ?? [];
      list.push(`${m.name}${years}`);
      models.set(m.productId, list);
    }
  }

  const items: CatalogItem[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    partNumber: r.partNumber,
    categoryName: r.categoryName,
    brandName: r.brandName,
    carBrandName: r.carBrandName,
    carModels: models.get(r.id) ?? [],
    isUniversal: r.isUniversal,
    priceUsd: r.priceUsd,
    imageUrl: images.get(r.id) ?? null,
    available: Number(r.stock) > 0,
  }));

  return { rows: items, total: countResult[0]?.count ?? 0 };
}

/** Categorías y marcas de vehículo activas, para los filtros del catálogo. */
export async function catalogFilters() {
  const [cats, brandsRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.name)),
    db
      .select({ id: carBrands.id, name: carBrands.name })
      .from(carBrands)
      .orderBy(asc(carBrands.name)),
  ]);
  return { categories: cats, carBrands: brandsRows };
}

/**
 * Tasas para mostrar los precios en bolívares. Se publican las mismas que ve
 * el cajero: son públicas de por sí (las publica el BCV).
 */
export async function catalogRates() {
  const rates = await currentRates();
  return {
    usdt: rates.usdt ? Number(rates.usdt.rateBsPerUsd) : null,
    bcv: rates.bcv ? Number(rates.bcv.rateBsPerUsd) : null,
    updatedAt: rates.usdt?.rateDate ?? rates.bcv?.rateDate ?? null,
  };
}
