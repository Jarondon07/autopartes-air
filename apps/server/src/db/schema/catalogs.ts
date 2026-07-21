import {
  integer,
  pgTable,
  serial,
  text,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
});

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
});

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
