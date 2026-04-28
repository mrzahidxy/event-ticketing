import { env } from '../utils/env';

export const appConfig = {
  name: env.APP_NAME,
  description: env.APP_DESCRIPTION,
  issuer: env.JWT_ISSUER,
} as const;
