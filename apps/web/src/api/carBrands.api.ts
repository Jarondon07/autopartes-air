import type {
  ApiSuccess,
  CarBrand,
  CarBrandInput,
  CarModel,
  CarModelInput,
} from '@autopartes-air/shared';
import { api } from './client';

// ---------- Marcas de vehículos ----------

export async function listCarBrands(): Promise<CarBrand[]> {
  const { data } = await api.get<ApiSuccess<CarBrand[]>>('/car-brands');
  return data.data;
}

export async function createCarBrand(input: CarBrandInput): Promise<CarBrand> {
  const { data } = await api.post<ApiSuccess<CarBrand>>('/car-brands', input);
  return data.data;
}

export async function updateCarBrand(
  id: number,
  input: CarBrandInput,
): Promise<CarBrand> {
  const { data } = await api.patch<ApiSuccess<CarBrand>>(`/car-brands/${id}`, input);
  return data.data;
}

export async function deleteCarBrand(id: number): Promise<void> {
  await api.delete(`/car-brands/${id}`);
}

// ---------- Modelos ----------

export async function listCarModels(brandId: number): Promise<CarModel[]> {
  const { data } = await api.get<ApiSuccess<CarModel[]>>('/car-models', {
    params: { brandId },
  });
  return data.data;
}

export async function createCarModel(input: CarModelInput): Promise<CarModel> {
  const { data } = await api.post<ApiSuccess<CarModel>>('/car-models', input);
  return data.data;
}

export async function updateCarModel(
  id: number,
  input: CarModelInput,
): Promise<CarModel> {
  const { data } = await api.patch<ApiSuccess<CarModel>>(`/car-models/${id}`, input);
  return data.data;
}

export async function deleteCarModel(id: number): Promise<void> {
  await api.delete(`/car-models/${id}`);
}
