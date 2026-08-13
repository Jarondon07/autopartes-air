import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { saleStatusEnum } from './enums';
import { clients } from './parties';
import { products } from './products';
import { users } from './rbac';

export const sales = pgTable(
  'sales',
  {
    id: serial('id').primaryKey(),
    clientId: integer('client_id').references(() => clients.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    saleDate: timestamp('sale_date', { withTimezone: true }).notNull().defaultNow(),
    // Snapshots al momento de la venta: tasa, IVA y totales en ambas monedas
    exchangeRate: numeric('exchange_rate', { precision: 14, scale: 2 }).notNull(),
    subtotalUsd: numeric('subtotal_usd', { precision: 14, scale: 2 }).notNull(),
    ivaPct: numeric('iva_pct', { precision: 5, scale: 2 }).notNull().default('16'),
    ivaUsd: numeric('iva_usd', { precision: 14, scale: 2 }).notNull(),
    totalUsd: numeric('total_usd', { precision: 14, scale: 2 }).notNull(),
    totalBs: numeric('total_bs', { precision: 14, scale: 2 }).notNull(),
    paymentMethods: text('payment_methods')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: saleStatusEnum('status').notNull().default('completada'),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidedBy: integer('voided_by').references(() => users.id),
    notes: varchar('notes', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('sales_client_idx').on(t.clientId),
    index('sales_user_idx').on(t.userId),
    index('sales_date_idx').on(t.saleDate),
    index('sales_status_idx').on(t.status),
  ],
);

export const saleDetails = pgTable(
  'sale_details',
  {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    quantity: bigint('quantity', { mode: 'number' }).notNull(),
    unitPriceUsd: numeric('unit_price_usd', { precision: 14, scale: 2 }).notNull(),
    subtotalUsd: numeric('subtotal_usd', { precision: 14, scale: 2 }).notNull(),
  },
  (t) => [index('sale_details_sale_idx').on(t.saleId)],
);

/** Desglose del pago: cuánto se pagó con cada método (USD cubierto y Bs cobrado). */
export const salePayments = pgTable(
  'sale_payments',
  {
    id: serial('id').primaryKey(),
    saleId: integer('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    method: text('method').notNull(),
    /** Valor cubierto en USD (canónico; la suma = total de la venta). */
    amountUsd: numeric('amount_usd', { precision: 14, scale: 2 }).notNull(),
    /** Bs realmente cobrado (0 en métodos USD; USD×USDT en métodos Bs). */
    amountBs: numeric('amount_bs', { precision: 14, scale: 2 }).notNull().default('0'),
  },
  (t) => [index('sale_payments_sale_idx').on(t.saleId)],
);
