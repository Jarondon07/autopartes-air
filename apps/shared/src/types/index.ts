import type { RoleName, PermissionCode } from '../constants/roles';
import type {
  DocumentType,
  ExchangeRateSource,
  MovementType,
  PaymentMethod,
  SaleStatus,
} from '../constants/enums';

// ---------- Respuesta estándar de la API ----------

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

// ---------- Entidades ----------

export interface Role {
  id: number;
  name: RoleName;
  description: string | null;
}

export interface User {
  id: number;
  username: string;
  fullName: string;
  roleId: number;
  roleName: RoleName;
  isActive: boolean;
  /**
   * El usuario debe cambiar su contraseña antes de poder usar el sistema.
   * Se activa al crear el usuario y al resetearle la contraseña desde
   * Configuración; se apaga cuando el propio usuario la cambia.
   */
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AuthUser extends User {
  permissions: PermissionCode[];
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface Category {
  id: number;
  name: string;
  abbreviation: string | null;
  description: string | null;
  isActive: boolean;
}

export interface Brand {
  id: number;
  name: string;
}

export interface Tax {
  id: number;
  name: string;
  rate: string;
  isActive: boolean;
  createdAt: string;
}

export interface Warehouse {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CarBrand {
  id: number;
  name: string;
  abbreviation: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CarModel {
  id: number;
  brandId: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface Product {
  id: number;
  code: string;
  partNumber: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  categoryId: number | null;
  brandId: number | null;
  carBrandId: number | null;
  /** Sirve para cualquier vehículo: sin marca ni modelos de carro. */
  isUniversal: boolean;
  costUsd: string;
  markupPct: string;
  priceUsd: string;
  stock: number;
  minStock: number;
  warehouseId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Modelo de carro compatible con un producto, con su rango de años y nombre para mostrar. */
export interface ProductCarModelLink {
  carModelId: number;
  name: string;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface ExchangeRate {
  id: number;
  rateDate: string;
  source: ExchangeRateSource;
  rateBsPerUsd: string;
  createdBy: number | null;
  createdAt: string;
}

export interface Client {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
}

export interface Supplier {
  id: number;
  rif: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
}

export interface PurchaseDetail {
  id: number;
  purchaseId: number;
  productId: number;
  quantity: number;
  unitCostUsd: string;
  subtotalUsd: string;
}

export interface Purchase {
  id: number;
  supplierId: number;
  userId: number;
  invoiceNumber: string | null;
  purchaseDate: string;
  exchangeRate: string;
  totalUsd: string;
  totalBs: string;
  notes: string | null;
  createdAt: string;
  details?: PurchaseDetail[];
}

export interface SaleDetail {
  id: number;
  saleId: number;
  productId: number;
  quantity: number;
  unitPriceUsd: string;
  subtotalUsd: string;
}

export interface SalePayment {
  method: PaymentMethod;
  amountUsd: string;
  amountBs: string;
}

export interface Sale {
  id: number;
  clientId: number | null;
  userId: number;
  saleDate: string;
  exchangeRate: string;
  subtotalUsd: string;
  ivaPct: string;
  ivaUsd: string;
  totalUsd: string;
  totalBs: string;
  paymentMethods: PaymentMethod[];
  status: SaleStatus;
  voidedAt: string | null;
  voidedBy: number | null;
  notes: string | null;
  createdAt: string;
  details?: SaleDetail[];
}

export interface InventoryMovement {
  id: number;
  productId: number;
  movementType: MovementType;
  quantity: number;
  stockAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  userId: number;
  notes: string | null;
  createdAt: string;
}
