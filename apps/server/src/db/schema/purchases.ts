import {
  bigint,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { suppliers } from './parties';
import { products } from './products';
import { users } from './rbac';

export const purchases = pgTable(
  'purchases',
  {
    id: serial('id').primaryKey(),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    invoiceNumber: varchar('invoice_number', { length: 50 }),
    purchaseDate: timestamp('purchase_date', { withTimezone: true }).notNull().defaultNow(),
    // Snapshot de la tasa al momento de la compra
    exchangeRate: numeric('exchange_rate', { precision: 14, scale: 4 }).notNull(),
    totalUsd: numeric('total_usd', { precision: 14, scale: 2 }).notNull(),
    totalBs: numeric('total_bs', { precision: 14, scale: 2 }).notNull(),
    notes: varchar('notes', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('purchases_supplier_idx').on(t.supplierId),
    index('purchases_date_idx').on(t.purchaseDate),
  ],
);

export const purchaseDetails = pgTable(
  'purchase_details',
  {
    id: serial('id').primaryKey(),
    purchaseId: integer('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    quantity: bigint('quantity', { mode: 'number' }).notNull(),
    unitCostUsd: numeric('unit_cost_usd', { precision: 14, scale: 2 }).notNull(),
    subtotalUsd: numeric('subtotal_usd', { precision: 14, scale: 2 }).notNull(),
  },
  (t) => [index('purchase_details_purchase_idx').on(t.purchaseId)],
);
