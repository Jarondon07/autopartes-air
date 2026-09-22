import {
  bigint,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { movementTypeEnum } from './enums';
import { products } from './products';
import { users } from './rbac';

/**
 * Log auditable de todo movimiento de stock. `quantity` es con signo:
 * positivo entra, negativo sale. `stockAfter` es el stock resultante.
 */
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    movementType: movementTypeEnum('movement_type').notNull(),
    quantity: bigint('quantity', { mode: 'number' }).notNull(),
    stockAfter: bigint('stock_after', { mode: 'number' }).notNull(),
    referenceType: varchar('reference_type', { length: 30 }),
    referenceId: integer('reference_id'),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    notes: varchar('notes', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('inventory_movements_product_idx').on(t.productId),
    index('inventory_movements_created_idx').on(t.createdAt),
  ],
);
