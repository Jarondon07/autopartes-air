import type { ApiSuccess } from '@autopartes-air/shared';
import { api } from './client';

/** Sube una imagen y devuelve su URL (ej. /uploads/xxxx.png). */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<ApiSuccess<{ url: string }>>('/uploads', form);
  return data.data.url;
}
