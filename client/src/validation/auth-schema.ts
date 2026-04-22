import { z } from 'zod'

import {
  emailSchema,
  nameSchema,
  passwordSchema,
} from '@/validation/common-schema'

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const registerRequestSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const registerSchema = registerRequestSchema
  .extend({
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type RegisterRequestInput = z.infer<typeof registerRequestSchema>
