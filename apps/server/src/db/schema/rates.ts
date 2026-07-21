import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { exchangeRateSourceEnum } from './enums';
import { users } from './rbac';

export const exchangeRates = pgTable(
  'exchange_rates',
  {
    id: serial('id').primaryKey(),
    rateDate: date('rate_date').notNull(),
    source: exchangeRateSourceEnum('source').notNull(),
    rateBsPerUsd: numeric('rate_bs_per_usd', { precision: 14, scale: 4 }).notNull(),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('exchange_rates_date_source').on(t.rateDate, t.source)],
);
