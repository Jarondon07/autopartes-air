import { and, asc, eq, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import {
  buildProductSku,
  type CreateProductInput,
  type ProductCarModelInput,
  type ProductFilters,
  type UpdateProductInput,
} from '@autopartes-air/shared';
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

/** IDs de categorías de un producto, en orden (la primera es la principal). */
async function getCategoryIds(exec: Executor, productId: number): Promise<number[]> {
  const rows = await exec
    .select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, productId))
    .orderBy(asc(productCategories.sortOrder));
  return rows.map((r) => r.categoryId);
}

/** Reemplaza las categorías de un producto (el orden define la principal = sortOrder 0). */
async function setCategories(tx: Executor, productId: number, categoryIds: number[]): Promise<void> {
  await tx.delete(productCategories).where(eq(productCategories.productId, productId));
  if (categoryIds.length > 0) {
    await tx
      .insert(productCategories)
      .values(categoryIds.map((categoryId, i) => ({ productId, categoryId, sortOrder: i })));
  }
}

/** Modelos de carro a los que sirve un producto, con nombre y rango de años. */
async function getCarModels(exec: Executor, productId: number) {
  return exec
    .select({
      carModelId: productCarModels.carModelId,
      name: carModels.name,
      yearFrom: productCarModels.yearFrom,
      yearTo: productCarModels.yearTo,
    })
    .from(productCarModels)
    .innerJoin(carModels, eq(carModels.id, productCarModels.carModelId))
    .where(eq(productCarModels.productId, productId))
    .orderBy(asc(carModels.name));
}

/** Reemplaza el set de modelos de carro de un producto (con años por modelo). */
async function setCarModels(
  tx: Executor,
  productId: number,
  models: ProductCarModelInput[],
): Promise<void> {
  await tx.delete(productCarModels).where(eq(productCarModels.productId, productId));
  if (models.length > 0) {
    await tx.insert(productCarModels).values(
      models.map((m) => ({
        productId,
        carModelId: m.carModelId,
        yearFrom: m.yearFrom ?? null,
        yearTo: m.yearTo ?? null,
      })),
    );
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
    const like = `%${f.q}%`;
    conditions.push(
      or(
        ilike(products.name, like),
        ilike(products.code, like),
        ilike(products.partNumber, like),
        // Marca del carro (ej. "Toyota") por la marca asignada al producto.
        inArray(
          products.carBrandId,
          db.select({ id: carBrands.id }).from(carBrands).where(ilike(carBrands.name, like)),
        ),
        // Modelo del carro (ej. "Yaris") vía la tabla puente producto↔modelo.
        inArray(
          products.id,
          db
            .select({ id: productCarModels.productId })
            .from(productCarModels)
            .innerJoin(carModels, eq(carModels.id, productCarModels.carModelId))
            .where(ilike(carModels.name, like)),
        ),
        // Marca del repuesto (ej. "Denso").
        inArray(
          products.brandId,
          db.select({ id: brands.id }).from(brands).where(ilike(brands.name, like)),
        ),
      )!,
    );
  }
  if (f.categoryId) {
    // Coincide si el producto tiene esa categoría en CUALQUIER posición (no solo la principal).
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
  const [categoryIds, carModels, images] = await Promise.all([
    getCategoryIds(db, id),
    getCarModels(db, id),
    getImages(db, id),
  ]);
  return { ...product, categoryIds, carModels, images };
}

export async function create(input: CreateProductInput) {
  const { carModels, categoryIds, images, costUsd, markupPct, code: _ignore, partNumber, ...rest } =
    input;
  const primaryCategoryId = categoryIds?.[0] ?? null;
  return withUniqueGuard(DUP_CODE, () =>
    db.transaction(async (tx) => {
      const { categoryAbbr, carBrandAbbr } = await skuParts(tx, primaryCategoryId, rest.carBrandId);
      const code = buildProductSku(categoryAbbr, carBrandAbbr, partNumber);
      const [product] = await tx
        .insert(products)
        .values({
          ...rest,
          categoryId: primaryCategoryId,
          partNumber: partNumber.trim(),
          code,
          // El costo llega con la compra; si no se da al crear, queda en 0.
          ...(costUsd !== undefined && { costUsd: costUsd.toString() }),
          markupPct: markupPct.toString(),
        })
        .returning();
      if (!product) throw new Error('No se pudo crear el producto');
      await setCategories(tx, product.id, categoryIds ?? []);
      await setCarModels(tx, product.id, carModels ?? []);
      await setImages(tx, product.id, images ?? []);
      return {
        ...product,
        categoryIds: categoryIds ?? [],
        carModels: await getCarModels(tx, product.id),
        images: images ?? [],
      };
    }),
  );
}

export async function update(id: number, input: UpdateProductInput) {
  const { carModels, categoryIds, images, costUsd, markupPct, code: _ignore, partNumber, ...rest } =
    input;
  return withUniqueGuard(DUP_CODE, () =>
    db.transaction(async (tx) => {
      const [existing] = await tx.select().from(products).where(eq(products.id, id));
      if (!existing) throw notFound('Producto no encontrado');

      // Categoría principal (primera) para columna y SKU.
      const primaryCategoryId =
        categoryIds !== undefined ? categoryIds[0] ?? null : existing.categoryId;

      // Recalcula el código si cambió el número de pieza, la categoría o la marca del carro.
      let codeUpdate: { code?: string; partNumber?: string } = {};
      if (partNumber !== undefined || categoryIds !== undefined || rest.carBrandId !== undefined) {
        const carBrandId = rest.carBrandId !== undefined ? rest.carBrandId : existing.carBrandId;
        const pn = partNumber !== undefined ? partNumber : existing.partNumber;
        const { categoryAbbr, carBrandAbbr } = await skuParts(tx, primaryCategoryId, carBrandId);
        codeUpdate = {
          code: buildProductSku(categoryAbbr, carBrandAbbr, pn),
          ...(partNumber !== undefined && { partNumber: partNumber.trim() }),
        };
      }

      const [product] = await tx
        .update(products)
        .set({
          ...rest,
          ...(categoryIds !== undefined && { categoryId: primaryCategoryId }),
          ...(costUsd !== undefined && { costUsd: costUsd.toString() }),
          ...(markupPct !== undefined && { markupPct: markupPct.toString() }),
          ...codeUpdate,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
      if (!product) throw notFound('Producto no encontrado');

      if (categoryIds !== undefined) {
        await setCategories(tx, id, categoryIds);
      }
      if (carModels !== undefined) {
        await setCarModels(tx, id, carModels);
      }
      if (images !== undefined) {
        await setImages(tx, id, images);
      }
      return {
        ...product,
        categoryIds: await getCategoryIds(tx, id),
        carModels: await getCarModels(tx, id),
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
