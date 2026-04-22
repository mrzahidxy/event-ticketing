import { Role } from '@prisma/client';
import { z } from 'zod';

import { PERMISSION_KEYS } from '../config/rbac';

export const userIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number(value)),
});

export const listUsersQuerySchema = z.object({
  role: z.nativeEnum(Role).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(6),
  role: z.nativeEnum(Role).optional(),
  permissions: z.array(z.enum(PERMISSION_KEYS)).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).nullable().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
  permissions: z.array(z.enum(PERMISSION_KEYS)).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
