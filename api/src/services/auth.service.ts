import { Role } from '@prisma/client';

import { LoginInput, RegisterInput } from '../schemas/auth.schema';
import { SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { cache } from '../utils/cache';
import { tokenService, TokenPair } from './token.service';
import { resolvePermissions } from '../config/rbac';

const USER_CACHE_TTL_SECONDS = 60 * 60; // 1 hour;

const sanitizeUser = <T extends { passwordHash?: string; role: Role }>(user: T): SanitizedUser => {
  const { passwordHash: _passwordHash, role, ...rest } = user;
  const permissions = resolvePermissions(role, (rest as Record<string, any>).permissions);
  return {
    ...(rest as unknown as SanitizedUser),
    role,
    roles: (rest as Record<string, any>).roles ?? [role],
    organizerId: (rest as Record<string, any>).organizerId ?? null,
    permissions,
  };
};

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  permissions: true,
  createdAt: true,
  updatedAt: true,
  ownedOrganizer: {
    select: {
      id: true,
    },
  },
  organizerMemberships: {
    select: {
      organizerId: true,
    },
    orderBy: {
      assignedAt: 'asc',
    },
    take: 1,
  },
} as const;

const withOrganizerId = <
  T extends {
    ownedOrganizer?: { id: string } | null;
    organizerMemberships?: Array<{ organizerId: string }>;
  }
>(
  user: T
): Omit<T, 'ownedOrganizer' | 'organizerMemberships'> & { organizerId: string | null } => {
  const { ownedOrganizer, organizerMemberships, ...rest } = user;

  return {
    ...rest,
    organizerId: ownedOrganizer?.id ?? organizerMemberships?.[0]?.organizerId ?? null,
  };
};

const cacheUserProfile = async (user: SanitizedUser) => {
  if (cache.isConnectedToRedis()) {
    await cache.set(`user:${user.id}`, user, USER_CACHE_TTL_SECONDS);
  }
};

const sanitizeAndCacheUser = async <
  T extends {
    passwordHash?: string;
    role: Role;
    ownedOrganizer?: { id: string } | null;
    organizerMemberships?: Array<{ organizerId: string }>;
  }
>(
  user: T
) => {
  const sanitized = sanitizeUser(withOrganizerId(user));
  await cacheUserProfile(sanitized);
  return sanitized;
};

const buildAuthResponse = (user: SanitizedUser, tokens: TokenPair) => ({
  accessToken: tokens.accessToken,
  accessTokenExpiresAt: tokens.accessTokenExpiresAt,
  refreshToken: {
    token: tokens.refreshToken,
    expiresAt: tokens.refreshTokenExpiresAt,
  },
  user,
});

const issueTokensForUser = async (user: {
  id: number;
  role: Role;
  organizerId?: string | null;
  permissions: string[];
}) =>
  tokenService.issueTokensForUser({
    userId: user.id,
    organizerId: user.organizerId ?? null,
    roles: [user.role],
    permissions: user.permissions,
  });

export const authService = {
  register: async (input: RegisterInput) => {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new HttpError(409, 'A user with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: Role.USER,
        permissions: resolvePermissions(Role.USER),
      },
      select: USER_SELECT,
    });

    const sanitized = await sanitizeAndCacheUser(user);
    const tokens = await issueTokensForUser(sanitized);
    return buildAuthResponse(sanitized, tokens);
  },

  login: async (input: LoginInput) => {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        ...USER_SELECT,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const matches = await comparePassword(input.password, user.passwordHash);
    if (!matches) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const sanitized = await sanitizeAndCacheUser(user);
    const tokens = await issueTokensForUser(sanitized);
    return buildAuthResponse(sanitized, tokens);
  },

  refreshSession: async (refreshToken: string | undefined, currentAccessToken?: string) => {
    if (!refreshToken) {
      throw new HttpError(401, 'Refresh token missing');
    }

    const { tokens, session } = await tokenService.refreshWithToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: USER_SELECT,
    });

    if (!user) {
      await tokenService.revokeRefreshToken(tokens.refreshToken);
      throw new HttpError(401, 'User could not be found');
    }

    const sanitized = await sanitizeAndCacheUser(user);
    await tokenService.revokeAccessToken(currentAccessToken);

    return buildAuthResponse(sanitized, tokens);
  },

  logout: async (refreshToken?: string, currentAccessToken?: string) => {
    await Promise.all([
      refreshToken ? tokenService.revokeRefreshToken(refreshToken) : Promise.resolve(),
      tokenService.revokeAccessToken(currentAccessToken),
    ]);
  },

  getProfile: async (userId: number) => {
    if (cache.isConnectedToRedis()) {
      const cachedUser = await cache.get<SanitizedUser>(`user:${userId}`);
      if (cachedUser) {
        return cachedUser;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    return sanitizeAndCacheUser(user);
  },
};
