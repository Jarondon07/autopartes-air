import { z } from 'zod';
import { DOCUMENT_TYPES } from '../constants/enums';

export const clientSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  documentNumber: z
    .string()
    .min(5)
    .max(15)
    .regex(/^\d+(-\d)?$/, 'Formato de documento inválido'),
  name: z.string().min(2).max(200),
  phone: z.string().max(20).nullish(),
  email: z.string().email().max(120).nullish(),
  address: z.string().max(300).nullish(),
});

export type ClientInput = z.infer<typeof clientSchema>;
