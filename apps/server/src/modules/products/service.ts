import { and, asc, eq, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import {
  buildProductSku,
  type CreateProductInput,
  type ProductFilters,
  type UpdateProductInput,
} from '@autopartes-air/shared';
import { db } from '../../infra/db';
import {
  carBrands,
  categories,
  productCarModels,
  productImages,
  products,
} from '../../db/schema';
import { notFound } from '../../middleware/error';
import { withUniqueGuard } from '../../lib/db-errors';

const DUP_CODE = 'Ya existe un producto con ese número de pieza';

/** Ejecutor de consultas: la conexión global o una transacción activa. */
type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Abreviaturas de categoría y marca del carro para armar el SKU. */
async function skuParts(exec: Executor, categoryId?: number | null, carBrandId?: number | null) {
  let categoryAbbr: string | null = null;
  let carBrandAbbr: string | null = null;
  if (categoryId) {
    const [c] = await exec
      .select({ a: categories.abbreviation })
      .from(categories)
      .where(eq(categories.id, categoryId));
    categoryAbbr = c?.a ?? null;
  }
  if (carBrandId) {
    const [b] = await exec
      .select({ a: carBrands.abbreviation })
      .from(carBrands)
      .where(eq(carBrands.id, carBrandId));
    carBrandAbbr = b?.a ?? null;
  }
  return { categoryAbbr, carBrandAbbr };
}

/** IDs de modelos de carro a los que sirve un producto. */
async function getCarModelIds(exec: Executor, productId: number): Promise<number[]> {
  const rows = await exec
    .select({ carModelId: productCarModels.carModelId })
    .from(productCarModels)
    .where(eq(productCarModels.productId, productId));
  return rows.map((r) => r.carModelId);
}

/** Reemplaza el set de modelos de carro de un producto. */
async function setCarModels(tx: Executor, productId: number, carModelIds: number[]): Promise<void> {
  await tx.delete(productCarModels).where(eq(productCarModels.productId, productId));
  if (carModelIds.length > 0) {
    await tx
      .insert(productCarModels)
      .values(carModelIds.map((carModelId) => ({ productId, carModelId })));
  }
}

/** URLs de imágenes del producto, en orden de visualización. */
async function getImages(exec: Executor, productId: number): Promise<string[]> {
  const rows = await exec
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder));
  return rows.map((r) => r.url);
}

/** Reemplaza las imágenes de un producto (el orden del array define la posición). */
async function setImages(tx: Executor, productId: number, urls: string[]): Promise<void> {
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  if (urls.length > 0) {
    await tx
      .insert(productImages)
      .values(urls.map((url, i) => ({ productId, url, sortOrder: i })));
  }
}

export async function list(f: ProductFilters) {
  const conditions: SQL[] = [];
  if (f.q) {
    conditions.push(or(ilike(products.name, `%${f.q}%`), ilike(products.code, `%${f.q}%`))!);
  }
  if (f.categoryId) conditions.push(eq(products.categoryId, f.categoryId));
  if (f.brandId) conditions.push(eq(products.brandId, f.brandId));
  if (f.isActive !== undefined) conditions.push(eq(products.isActive, f.isActive));

  const where = conditions.length ? and(...conditions) : undefined;
  const offset = (f.page - 1) * f.limit;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(asc(products.name))
      .limit(f.limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
  ]);

  // Imagen principal (menor sortOrder) de cada producto listado, para miniatura.
  const ids = rows.map((r) => r.id);
  const primary = new Map<number, string>();
  if (ids.length) {
    const imgs = await db
      .select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.sortOrder));
    for (const im of imgs) if (!primary.has(im.productId)) primary.set(im.productId, im.url);
  }

  return {
    rows: rows.map((r) => ({ ...r, primaryImageUrl: primary.get(r.id) ?? null })),
    total: countResult[0]?.count ?? 0,
  };
}

/** Búsqueda rápida para el POS: hasta 20 productos activos por código o nombre. */
export async function search(q: string) {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        or(ilike(products.name, `%${q}%`), ilike(products.code, `%${q}%`)),
      ),
    )
    .orderBy(asc(products.name))
    .limit(20);
}

/** Productos activos cuyo stock es menor o igual a su stock mínimo. */
export async function lowStock() {
  return db
    .select()
    .from(products)
    .where(and(eq(products.isActive, true), lte(products.stock, products.minStock)))
    .orderBy(asc(products.stock));
}

export async function getById(id: number) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) throw notFound('Producto no encontrado');
  const [carModelIds, images] = await Promise.all([
    getCarModelIds(db, id),
    getImages(db, id),
  ]);
  return { ...product, carModelIds, images };
}

export async function create(input: CreateProductInput) {
  const { carModelIds, images, costUsd, markupPct, code: _ignore, partNumber, ...rest } = input;
  return withUniqueGuard(DUP_CODE, () =>
    db.transaction(async (tx) => {
      const { categoryAbbr, carBrandAbbr } = await skuParts(tx, rest.categoryId, rest.carBrandId);
      const code = buildProductSku(categoryAbbr, carBrandAbbr, partNumber);
      const [product] = await tx
        .insert(products)
        .values({
          ...rest,
          partNumber: partNumber.trim(),
          code,
          // El costo llega con la compra; si no se da al crear, queda en 0.
          ...(costUsd !== undefined && { costUsd: costUsd.toString() }),
          markupPct: markupPct.toString(),
        })
        .returning();
      if (!product) throw new Error('No se pudo crear el producto');
      await setCarModels(tx, product.id, carModelIds ?? []);
      await setImages(tx, product.id, images ?? []);
      return { ...product, carModelIds: carModelIds ?? [], images: images ?? [] };
    }),
  );
}

export async function update(id: number, input: UpdateProductInput) {
  const { carModelIds, images, costUsd, markupPct, code: _ignore, partNumber, ...rest } = input;
  return withUniqueGuard(DUP_CODE, () =>
    db.transaction(async (tx) => {
      const [existing] = await tx.select().from(products).where(eq(products.id, id));
      if (!existing) throw notFound('Producto no encontrado');

      // Recalcula el código si cambió el número de pieza, la categoría o la marca del carro.
      let codeUpdate: { code?: string; partNumber?: string } = {};
      if (partNumber !== undefined || rest.categoryId !== undefined || rest.carBrandId !== undefined) {
        const categoryId = rest.categoryId !== undefined ? rest.categoryId : existing.categoryId;
        const carBrandId = rest.carBrandId !== undefined ? rest.carBrandId : existing.carBrandId;
        const pn = partNumber !== undefined ? partNumber : existing.partNumber;
        const { categoryAbbr, carBrandAbbr } = await skuParts(tx, categoryId, carBrandId);
        codeUpdate = {
          code: buildProductSku(categoryAbbr, carBrandAbbr, pn),
          ...(partNumber !== undefined && { partNumber: partNumber.trim() }),
        };
      }

      const [product] = await tx
        .update(products)
        .set({
          ...rest,
          ...(costUsd !== undefined && { costUsd: costUsd.toString() }),
          ...(markupPct !== undefined && { markupPct: markupPct.toString() }),
          ...codeUpdate,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
      if (!product) throw notFound('Producto no encontrado');

      if (carModelIds !== undefined) {
        await setCarModels(tx, id, carModelIds);
      }
      if (images !== undefined) {
        await setImages(tx, id, images);
      }
      return {
        ...product,
        carModelIds: carModelIds ?? (await getCarModelIds(tx, id)),
        images: images ?? (await getImages(tx, id)),
      };
    }),
  );
}

/** Baja lógica: marca el producto como inactivo (conserva historial). */
export async function remove(id: number) {
  const [product] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  if (!product) throw notFound('Producto no encontrado');
  return product;
}
