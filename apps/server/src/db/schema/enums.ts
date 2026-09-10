import { pgEnum } from 'drizzle-orm/pg-core';
import {
  DOCUMENT_TYPES,
  EXCHANGE_RATE_SOURCES,
  MOVEMENT_TYPES,
  SALE_STATUSES,
} from '@autopartes-air/shared';

export const documentTypeEnum = pgEnum('document_type', DOCUMENT_TYPES);
export const exchangeRateSourceEnum = pgEnum('exchange_rate_source', EXCHANGE_RATE_SOURCES);
export const saleStatusEnum = pgEnum('sale_status', SALE_STATUSES);
export const movementTypeEnum = pgEnum('movement_type', MOVEMENT_TYPES);
