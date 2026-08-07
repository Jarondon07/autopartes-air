import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Actualización del perfil propio (datos que el usuario puede cambiar de sí mismo). */
export const updateProfileSchema = z.object({
  fullName: z.string().min(3).max(120),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Cambio de contraseña propia. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(100),
  newPassword: z.string().min(6).max(100),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
