import {
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { documentTypeEnum } from './enums';

export const clients = pgTable(
  'clients',
  {
    id: serial('id').primaryKey(),
    documentType: documentTypeEnum('document_type').notNull(),
    documentNumber: varchar('document_number', { length: 15 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 120 }),
    address: varchar('address', { length: 300 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('clients_document').on(t.documentType, t.documentNumber)],
);

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  rif: varchar('rif', { length: 15 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  contactName: varchar('contact_name', { length: 120 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 120 }),
  address: varchar('address', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
