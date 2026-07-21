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
import { brands, categories, vehicles } from './catalogs';

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    categoryId: integer('category_id').references(() => categories.id),
    brandId: integer('brand_id').references(() => brands.id),
    costUsd: numeric('cost_usd', { precision: 14, scale: 2 }).notNull().default('0'),
    markupPct: numeric('markup_pct', { precision: 5, scale: 2 }).notNull().default('30'),
    // Columna generada: el precio de venta siempre es consistente con costo y markup
    priceUsd: numeric('price_usd', { precision: 14, scale: 2 }).generatedAlwaysAs(
      sql`round(cost_usd * (1 + markup_pct / 100), 2)`,
    ),
    stock: integer('stock').notNull().default(0),
    minStock: integer('min_stock').notNull().default(0),
    location: varchar('location', { length: 100 }),
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
