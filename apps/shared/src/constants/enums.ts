export const PAYMENT_METHODS = [
  'efectivo_usd',
  'efectivo_bs',
  'transferencia',
  'pago_movil',
  'punto_venta',
  'zelle',
  'mixto',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo_usd: 'Efectivo USD',
  efectivo_bs: 'Efectivo Bs',
  transferencia: 'Transferencia',
  pago_movil: 'Pago Móvil',
  punto_venta: 'Punto de Venta',
  zelle: 'Zelle',
  mixto: 'Mixto',
};

export const DOCUMENT_TYPES = ['V', 'J', 'E', 'P', 'G'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const EXCHANGE_RATE_SOURCES = [
  'bcv',
  'euro',
  'intervencion',
  'usdt',
] as const;
export type ExchangeRateSource = (typeof EXCHANGE_RATE_SOURCES)[number];

export const EXCHANGE_RATE_SOURCE_LABELS: Record<ExchangeRateSource, string> = {
  bcv: 'BCV (USD)',
  euro: 'Euro (BCV)',
  intervencion: 'Intervención',
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
