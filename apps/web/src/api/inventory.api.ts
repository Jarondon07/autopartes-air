import type {
  ApiSuccess,
  InventoryAdjustmentInput,
  InventoryMovement,
  MovementType,
} from '@autopartes-air/shared';
import { api } from './client';

/** Movimiento con datos del producto (respuesta del listado). */
export interface MovementRow extends InventoryMovement {
  productCode: string;
  productName: string;
}

export interface MovementsPage {
  data: MovementRow[];
  meta: { page: number; limit: number; total: number };
}

export async function listMovements(params: {
  page?: number;
  limit?: number;
  productId?: number;
  movementType?: MovementType;
}): Promise<MovementsPage> {
  const { data } = await api.get<ApiSuccess<MovementRow[]>>('/inventory/movements', {
    params,
  });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

export async function createAdjustment(
  input: InventoryAdjustmentInput,
): Promise<InventoryMovement> {
  const { data } = await api.post<ApiSuccess<InventoryMovement>>(
    '/inventory/adjustments',
    input,
  );
  return data.data;
}
