import type {
  ApiSuccess,
  Brand,
  BrandInput,
  Category,
  CategoryInput,
  Vehicle,
  VehicleInput,
} from '@autopartes-air/shared';
import { api } from './client';

// ---------- Categorías ----------

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<ApiSuccess<Category[]>>('/categories');
  return data.data;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await api.post<ApiSuccess<Category>>('/categories', input);
  return data.data;
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<Category> {
  const { data } = await api.patch<ApiSuccess<Category>>(`/categories/${id}`, input);
  return data.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}

// ---------- Marcas ----------

export async function listBrands(): Promise<Brand[]> {
  const { data } = await api.get<ApiSuccess<Brand[]>>('/brands');
  return data.data;
}

export async function createBrand(input: BrandInput): Promise<Brand> {
  const { data } = await api.post<ApiSuccess<Brand>>('/brands', input);
  return data.data;
}

export async function updateBrand(id: number, input: BrandInput): Promise<Brand> {
  const { data } = await api.patch<ApiSuccess<Brand>>(`/brands/${id}`, input);
  return data.data;
}

export async function deleteBrand(id: number): Promise<void> {
  await api.delete(`/brands/${id}`);
}

// ---------- Vehículos ----------

export async function listVehicles(): Promise<Vehicle[]> {
  const { data } = await api.get<ApiSuccess<Vehicle[]>>('/vehicles');
  return data.data;
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const { data } = await api.post<ApiSuccess<Vehicle>>('/vehicles', input);
  return data.data;
}

export async function updateVehicle(
  id: number,
  input: VehicleInput,
): Promise<Vehicle> {
  const { data } = await api.patch<ApiSuccess<Vehicle>>(`/vehicles/${id}`, input);
  return data.data;
}

export async function deleteVehicle(id: number): Promise<void> {
  await api.delete(`/vehicles/${id}`);
}
