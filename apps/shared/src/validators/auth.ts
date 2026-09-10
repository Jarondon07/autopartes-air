import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  /**
   * "Recordarme": la sesión sobrevive al cierre del navegador (cookie de 7
   * días). Sin esto la cookie es de sesión y se pierde al cerrar — es lo que
   * conviene en la caja, que es un equipo compartido.
   */
  remember: z.boolean().optional(),
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

/**
 * PIN de autorización: 4 a 6 dígitos. No sustituye a la contraseña — sirve
 * para autorizar acciones puntuales en el mostrador (cambiar un precio en el
 * cajero) sin teclear la clave completa delante del cliente.
 */
export const securityPinSchema = z
  .string()
  .regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos');

/** Fijar o cambiar el PIN propio. Se pide la contraseña para confirmar identidad. */
export const setSecurityPinSchema = z.object({
  currentPassword: z.string().min(6).max(100),
  pin: securityPinSchema,
});

export type SetSecurityPinInput = z.infer<typeof setSecurityPinSchema>;
