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
  description: string | null;
}

export interface Brand {
  id: number;
  name: string;
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
  name: string;
  description: string | null;
  categoryId: number | null;
  brandId: number | null;
  costUsd: string;
  markupPct: string;
  priceUsd: string;
  stock: number;
  minStock: number;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  paymentMethod: PaymentMethod;
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
