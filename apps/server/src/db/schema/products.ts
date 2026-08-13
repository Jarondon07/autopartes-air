import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { brands, carBrands, carModels, categories, vehicles, warehouses } from './catalogs';

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    partNumber: varchar('part_number', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
    shortDescription: varchar('short_description', { length: 255 }),
    description: text('description'),
    categoryId: integer('category_id').references(() => categories.id),
    brandId: integer('brand_id').references(() => brands.id),
    carBrandId: integer('car_brand_id').references(() => carBrands.id),
    costUsd: numeric('cost_usd', { precision: 14, scale: 2 }).notNull().default('0'),
    markupPct: numeric('markup_pct', { precision: 5, scale: 2 }).notNull().default('30'),
    // Columna generada: precio de venta = costo × (1 + markup), redondeado SIEMPRE
    // hacia arriba a dólar entero (ej. 12,35 → 13,00).
    priceUsd: numeric('price_usd', { precision: 14, scale: 2 }).generatedAlwaysAs(
      sql`ceil(cost_usd * (1 + markup_pct / 100))`,
    ),
    stock: bigint('stock', { mode: 'number' }).notNull().default(0),
    minStock: bigint('min_stock', { mode: 'number' }).notNull().default(0),
    warehouseId: integer('warehouse_id').references(() => warehouses.id),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('products_name_idx').on(t.name),
    index('products_category_idx').on(t.categoryId),
    index('products_brand_idx').on(t.brandId),
  ],
);

export const productVehicles = pgTable(
  'product_vehicles',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    vehicleId: integer('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.vehicleId] })],
);

/** Imágenes de un producto (galería). `sortOrder` define la posición; 0 = principal. */
export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 300 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/** Categorías de un producto (N:M). La primera (sortOrder 0) es la principal y define el SKU. */
export const productCategories = pgTable(
  'product_categories',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] })],
);

/** Modelos de carro a los que sirve un producto (N:M), con rango de años por modelo. */
export const productCarModels = pgTable(
  'product_car_models',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    carModelId: integer('car_model_id')
      .notNull()
      .references(() => carModels.id, { onDelete: 'cascade' }),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
  },
  (t) => [primaryKey({ columns: [t.productId, t.carModelId] })],
);
