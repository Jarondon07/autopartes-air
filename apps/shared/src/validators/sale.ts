import { z } from 'zod';
import { PAYMENT_METHODS } from '../constants/enums';
import { securityPinSchema } from './auth';
import { moneySchema, paginationSchema } from './common';

export const saleDetailInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  /** Permite ajustar el precio en el POS; si se omite se usa el precio vigente del producto. */
  unitPriceUsd: moneySchema.optional(),
});

/** Un pago del desglose: método + valor cubierto en USD + Bs cobrado. */
export const salePaymentInputSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amountUsd: moneySchema,
  amountBs: moneySchema.default(0),
});

/** Fecha sin hora (`YYYY-MM-DD`), como la guarda la columna `date`. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)');

export const createSaleSchema = z
  .object({
    clientId: z.number().int().positive().nullish(),
    /**
     * Desglose del pago. Vacío solo en una venta a crédito sin abono inicial:
     * el cliente se lleva la mercancía y no deja nada.
     */
    payments: z.array(salePaymentInputSchema),
    notes: z.string().max(500).nullish(),
    /** Si aplica el IVA al total. Por defecto NO se aplica. */
    applyIva: z.boolean().optional(),
    /** Venta a crédito: el saldo queda como deuda del cliente. */
    isCredit: z.boolean().optional(),
    /** Fecha acordada de pago. Requerida en las ventas a crédito. */
    dueDate: dateOnlySchema.nullish(),
    details: z.array(saleDetailInputSchema).min(1, 'La venta necesita al menos un producto'),
    /**
     * Token de autorización de precio (`POST /sales/price-authorization`).
     * Requerido solo si algún renglón lleva un precio distinto al de lista.
     */
    priceAuthToken: z.string().nullish(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (v.isCredit) {
      // Una deuda sin dueño no se puede cobrar.
      if (v.clientId == null) issue('clientId', 'Una venta a crédito necesita cliente');
      if (!v.dueDate) issue('dueDate', 'Indica la fecha de pago');
    } else if (v.payments.length === 0) {
      issue('payments', 'Selecciona al menos un método de pago');
    }
  });

/**
 * Autorización para vender a un precio distinto al de lista: usuario con el
 * permiso `sales:override_price` + su PIN. Devuelve un token de corta vida.
 */
export const priceAuthorizationSchema = z.object({
  username: z.string().min(3).max(50),
  pin: securityPinSchema,
});

export type PriceAuthorizationInput = z.infer<typeof priceAuthorizationSchema>;

export const saleFiltersSchema = paginationSchema.extend({
  clientId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(['completada', 'anulada']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Resumen agregado de ventas (para dashboard/reportes): suma en SQL, sin filas. */
export const salesSummaryQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(['completada', 'anulada']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type SalesSummaryQuery = z.infer<typeof salesSummaryQuerySchema>;

export type SalePaymentInput = z.infer<typeof salePaymentInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleFilters = z.infer<typeof saleFiltersSchema>;
