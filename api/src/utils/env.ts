import 'dotenv/config';

import { z } from 'zod';

const envBoolean = (defaultValue: boolean) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return defaultValue ? 'true' : 'false';
      }

      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }

      if (typeof value === 'string') {
        return value.trim().toLowerCase();
      }

      return value;
    },
    z.enum(['true', 'false']).transform((flag) => flag === 'true')
  );

const baseEnvSchema = z.object({
  APP_NAME: z.string().default('Multi-Tenant Event Intelligence Platform'),
  APP_DESCRIPTION: z
    .string()
    .default('Multi-tenant event intelligence platform'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET should be at least 16 characters long'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().default(30),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  REFRESH_TOKEN_COOKIE_NAME: z.string().default('refreshToken'),
  REFRESH_TOKEN_COOKIE_PATH: z.string().default('/api'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: envBoolean(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  JWT_ISSUER: z.string().default('event-ticketing'),
  JWT_AUDIENCE: z.string().optional(),
  CORS_ORIGIN:
    process.env.NODE_ENV === 'production'
      ? z.string().min(1, 'CORS_ORIGIN is required in production')
      : z
          .string()
          .default(
            'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173',
          ),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CURRENCY: z.string().default('usd'),
  TRUST_PROXY: envBoolean(false),
  REDIS_URL: z.string().optional(),
});

const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  const origins = data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (data.NODE_ENV === 'production' && (origins.length === 0 || origins.includes('*'))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CORS_ORIGIN'],
      message: 'CORS_ORIGIN must list explicit origins in production',
    });
  }

  if (data.COOKIE_SAME_SITE === 'none' && !data.COOKIE_SECURE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['COOKIE_SECURE'],
      message: 'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none',
    });
  }

  if (data.NODE_ENV === 'production' && !data.REDIS_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_URL'],
      message: 'REDIS_URL is required in production',
    });
  }

  if (Boolean(data.STRIPE_SECRET_KEY) !== Boolean(data.STRIPE_WEBHOOK_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STRIPE_SECRET_KEY'],
      message: 'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set together',
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['STRIPE_WEBHOOK_SECRET'],
      message: 'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set together',
    });
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
