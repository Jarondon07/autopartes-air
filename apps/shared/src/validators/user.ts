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

export const updateUserSchema = createUserSchema
  .partial()
  .extend({ isActive: z.boolean().optional() });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
