import type {
  ApiSuccess,
  CreateProductInput,
  Product,
  ProductFilters,
  UpdateProductInput,
} from '@autopartes-air/shared';
import { api } from './client';

/** Producto con sus vehículos compatibles (respuesta de detalle). */
export interface ProductDetail extends Product {
  vehicleIds: number[];
}

export interface ProductsPage {
  data: Product[];
  meta: { page: number; limit: number; total: number };
}

/** GET /products — lista paginada con filtros. */
export async function listProducts(
  filters: Partial<ProductFilters>,
): Promise<ProductsPage> {
  const { data } = await api.get<ApiSuccess<Product[]>>('/products', {
    params: filters,
  });
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, limit: 20, total: data.data.length },
  };
}

/** GET /products/:id — detalle con vehículos compatibles. */
export async function getProduct(id: number): Promise<ProductDetail> {
  const { data } = await api.get<ApiSuccess<ProductDetail>>(`/products/${id}`);
  return data.data;
}

/** POST /products */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data } = await api.post<ApiSuccess<Product>>('/products', input);
  return data.data;
}

/** PATCH /products/:id */
export async function updateProduct(
  id: number,
  input: UpdateProductInput,
): Promise<Product> {
  const { data } = await api.patch<ApiSuccess<Product>>(`/products/${id}`, input);
  return data.data;
}

/** DELETE /products/:id — baja lógica (isActive = false). */
export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}
