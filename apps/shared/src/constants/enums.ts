export const PAYMENT_METHODS = [
  'efectivo_usd',
  'efectivo_bs',
  'transferencia',
  'pago_movil',
  'punto_venta',
  'zelle',
  'binance_usdt',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo_usd: 'Efectivo USD',
  efectivo_bs: 'Efectivo Bs',
  transferencia: 'Transferencia',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Punto de Venta',
  zelle: 'Zelle',
  binance_usdt: 'Binance USDT',
};

/** Moneda de cada método de pago: define el precio a cobrar (USD vs Bs vía USDT/BCV). */
export const PAYMENT_METHOD_CURRENCY: Record<PaymentMethod, 'USD' | 'BS'> = {
  efectivo_usd: 'USD',
  zelle: 'USD',
  binance_usdt: 'USD',
  efectivo_bs: 'BS',
  transferencia: 'BS',
  pago_movil: 'BS',
  punto_venta: 'BS',
};

/** Métodos agrupados por moneda, en orden de presentación (para el select agrupado). */
export const PAYMENT_METHODS_BY_CURRENCY: { currency: 'USD' | 'BS'; methods: PaymentMethod[] }[] = [
  { currency: 'USD', methods: ['efectivo_usd', 'zelle', 'binance_usdt'] },
  { currency: 'BS', methods: ['efectivo_bs', 'transferencia', 'pago_movil', 'punto_venta'] },
];

export const DOCUMENT_TYPES = ['V', 'J', 'E', 'P', 'G'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * Fuentes de tasa. `intervencion` se eliminó en sep. 2026: Radar dejó de
 * publicarla (la última quedó congelada el 13/08/2026) y una tasa que no se
 * actualiza miente más de lo que informa.
 */
export const EXCHANGE_RATE_SOURCES = ['bcv', 'euro', 'usdt'] as const;
export type ExchangeRateSource = (typeof EXCHANGE_RATE_SOURCES)[number];

export const EXCHANGE_RATE_SOURCE_LABELS: Record<ExchangeRateSource, string> = {
  bcv: 'BCV (USD)',
  euro: 'Euro (BCV)',
  usdt: 'USDT (Paralelo)',
};

export const SALE_STATUSES = ['completada', 'anulada'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const MOVEMENT_TYPES = ['compra', 'venta', 'ajuste', 'anulacion'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  compra: 'Compra',
  venta: 'Venta',
  ajuste: 'Ajuste',
  anulacion: 'Anulación',
};

/** IVA vigente por defecto (%). Cada venta guarda su propio snapshot. */
export const DEFAULT_IVA_PCT = 16;
