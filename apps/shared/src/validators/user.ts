import { z } from 'zod';

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9._-]+$/i, 'Solo letras, números, punto, guion y guion bajo'),
  password: z.string().min(6).max(100),
  fullName: z.string().min(3).max(120),
  roleId: z.number().int().positive(),
});

/** Actualización de usuario (no cambia username ni contraseña aquí). */
export const updateUserSchema = z.object({
  fullName: z.string().min(3).max(120).optional(),
  roleId: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

/** Reseteo de contraseña por un administrador. */
export const resetPasswordSchema = z.object({
  password: z.string().min(6).max(100),
});

/** Permisos asignados a un rol (lista de códigos de permiso). */
export const setRolePermissionsSchema = z.object({
  permissions: z.array(z.string().max(80)),
});

/** Creación de un rol nuevo (dinámico). El nombre se normaliza a minúsculas. */
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9 _-]+$/i, 'Solo letras, números, espacio, guion y guion bajo')
    .transform((s) => s.trim().toLowerCase()),
  description: z.string().max(200).nullish(),
  permissions: z.array(z.string().max(80)).default([]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
