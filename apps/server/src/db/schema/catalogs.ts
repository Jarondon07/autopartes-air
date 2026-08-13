import {
  boolean,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

/** Impuestos configurables (ej. IVA 16%). El total aplicado = suma de los activos. */
export const taxes = pgTable('taxes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 60 }).notNull().unique(),
  rate: numeric('rate', { precision: 5, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Almacenes: el lugar donde se guarda el repuesto (catálogo). */
export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 80 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Categorías (lista plana). El "código" visible es el propio id. */
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  /** Abreviatura para el SKU (ej. Evaporadores → EVA). */
  abbreviation: varchar('abbreviation', { length: 10 }),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
});

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
});

/** Marcas de vehículos (carros), con logo. Distinto de `brands` (marca del repuesto). */
export const carBrands = pgTable('car_brands', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  /** Abreviatura para el SKU (ej. Volkswagen → VW). */
  abbreviation: varchar('abbreviation', { length: 10 }),
  logoUrl: varchar('logo_url', { length: 300 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Modelos de cada marca de vehículo. */
export const carModels = pgTable(
  'car_models',
  {
    id: serial('id').primaryKey(),
    brandId: integer('brand_id')
      .notNull()
      .references(() => carBrands.id),
    name: varchar('name', { length: 100 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('car_models_brand_name').on(t.brandId, t.name)],
);

export const vehicles = pgTable(
  'vehicles',
  {
    id: serial('id').primaryKey(),
    make: varchar('make', { length: 80 }).notNull(),
    model: varchar('model', { length: 80 }).notNull(),
    yearFrom: integer('year_from'),
    yearTo: integer('year_to'),
  },
  (t) => [unique('vehicles_make_model_years').on(t.make, t.model, t.yearFrom, t.yearTo)],
);
