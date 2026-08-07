import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CarBrandInput, CarModelInput } from '@autopartes-air/shared';
import * as api from '../api/carBrands.api';

const BRANDS = 'car-brands';
const MODELS = 'car-models';

// ---------- Marcas ----------

export function useCarBrands() {
  return useQuery({ queryKey: [BRANDS], queryFn: api.listCarBrands });
}

export function useCreateCarBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CarBrandInput) => api.createCarBrand(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BRANDS] }),
  });
}

export function useUpdateCarBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CarBrandInput }) =>
      api.updateCarBrand(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BRANDS] }),
  });
}

export function useDeleteCarBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteCarBrand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [BRANDS] }),
  });
}

// ---------- Modelos ----------

export function useCarModels(brandId: number | null) {
  return useQuery({
    queryKey: [MODELS, brandId],
    queryFn: () => api.listCarModels(brandId as number),
    enabled: brandId != null,
  });
}

export function useCreateCarModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CarModelInput) => api.createCarModel(input),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [MODELS, v.brandId] }),
  });
}

export function useUpdateCarModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CarModelInput }) =>
      api.updateCarModel(id, input),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [MODELS, v.input.brandId] }),
  });
}

export function useDeleteCarModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; brandId: number }) => api.deleteCarModel(id),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: [MODELS, v.brandId] }),
  });
}
