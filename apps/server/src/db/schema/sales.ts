import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
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
    /** Venta a crédito: la mercancía salió y el pago queda pendiente. */
    isCredit: boolean('is_credit').notNull().default(false),
    /**
     * Fecha acordada de pago. Es `date` (sin hora) a propósito: con
     * `timestamptz` la fecha se corre un día según la zona del cliente.
     */
    dueDate: date('due_date'),
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

/**
 * Desglose del pago: cuánto se pagó con cada método (USD cubierto y Bs cobrado).
 *
 * También guarda los **abonos** de una venta a crédito: un abono es un pago
 * como cualquier otro, solo que en otra fecha. Por eso cada fila lleva su
 * `paidAt`, la tasa con la que se convirtió y quién lo recibió. El saldo de una
 * deuda es `sales.totalUsd - SUM(amountUsd)`.
 */
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
    /** Cuándo entró el dinero (en el mostrador o como abono posterior). */
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
    /** Tasa usada para convertir a Bs; null si el método se cobra en USD. */
    exchangeRate: numeric('exchange_rate', { precision: 14, scale: 2 }),
    /** Quién recibió el pago. Null en las filas anteriores a las deudas. */
    userId: integer('user_id').references(() => users.id),
    notes: varchar('notes', { length: 200 }),
  },
  (t) => [
    index('sale_payments_sale_idx').on(t.saleId),
    index('sale_payments_paid_idx').on(t.paidAt),
  ],
);
