import { SignOptions, Secret, sign, verify, VerifyOptions } from 'jsonwebtoken';

import { Role } from '@prisma/client';

import { env } from './env';
import { HttpError } from './http-error';

export interface AccessTokenPayload {
  userId: number;
  organizerId?: string | null;
  roles: Role[];
  permissions: string[];
}

export interface DecodedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
}

const accessTokenSecret: Secret = env.JWT_SECRET;
const accessTokenTtlMinutes = env.ACCESS_TOKEN_TTL_MINUTES;

const issuerOptions = {
  issuer: env.JWT_ISSUER,
  ...(env.JWT_AUDIENCE ? { audience: env.JWT_AUDIENCE } : {}),
} satisfies VerifyOptions;

export const createAccessToken = (payload: AccessTokenPayload, options?: SignOptions) => {
  const expiresIn = options?.expiresIn ?? `${accessTokenTtlMinutes}m`;
  const signOptions: SignOptions = {
    ...issuerOptions,
    ...(options ?? {}),
    expiresIn,
  };

  const token = sign(payload, accessTokenSecret, signOptions);
  const expiresAt = new Date(Date.now() + accessTokenTtlMinutes * 60 * 1000);

  return { token, expiresAt };
};

export const verifyAccessToken = (token: string): DecodedAccessToken => {
  try {
    const decoded = verify(token, accessTokenSecret, issuerOptions);
    if (typeof decoded !== 'object' || decoded === null) {
      throw new HttpError(401, 'Invalid token');
    }

    const { userId, roles, permissions, organizerId, iat, exp } = decoded as DecodedAccessToken;

    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      throw new HttpError(401, 'Invalid token payload');
    }

    return {
      userId,
      roles,
      permissions: Array.isArray(permissions) ? permissions : [],
      organizerId: typeof organizerId === 'string' ? organizerId : null,
      iat,
      exp,
    };
  } catch (error) {
    throw new HttpError(401, 'Invalid or expired token');
  }
};
