import { sql } from 'drizzle-orm';
import {
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
import { brands, carBrands, carModels, categories, vehicles } from './catalogs';

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
    // Columna generada: el precio de venta siempre es consistente con costo y markup
    priceUsd: numeric('price_usd', { precision: 14, scale: 2 }).generatedAlwaysAs(
      sql`round(cost_usd * (1 + markup_pct / 100), 2)`,
    ),
    stock: integer('stock').notNull().default(0),
    minStock: integer('min_stock').notNull().default(0),
    location: varchar('location', { length: 100 }),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
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

/** Modelos de carro a los que sirve un producto (N:M). */
export const productCarModels = pgTable(
  'product_car_models',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    carModelId: integer('car_model_id')
      .notNull()
      .references(() => carModels.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.carModelId] })],
);
