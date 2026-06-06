import { Role } from '@prisma/client';
import { NextFunction, Response } from 'express';

import { verifyAccessToken, type DecodedAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import type { AuthenticatedRequest } from '../types/http';
import { cache } from '../utils/cache';
import type { SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { resolvePermissions } from '../config/rbac';
import { tokenService } from '../services/token.service';

type GuardOptions =
  | Role[]
  | {
      roles?: Role[];
      permissions?: string[];
      permissionMode?: 'all' | 'any';
    };

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  permissions: true,
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
  createdAt: true,
  updatedAt: true,
} as const;

type AuthUserRecord = {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  permissions?: string[] | null;
  organizerId?: string | null;
  ownedOrganizer?: { id: string } | null;
  organizerMemberships?: Array<{ organizerId: string }>;
  createdAt?: Date;
  updatedAt?: Date;
};

type AuthContext = {
  payload: DecodedAccessToken;
  user: SanitizedUser;
};

const toAuthenticatedUser = (user: AuthUserRecord): SanitizedUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  roles: [user.role],
  organizerId:
    user.organizerId ??
    user.ownedOrganizer?.id ??
    user.organizerMemberships?.[0]?.organizerId ??
    null,
  permissions: resolvePermissions(user.role, user.permissions ?? undefined),
  ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  ...(user.updatedAt ? { updatedAt: user.updatedAt } : {}),
});

async function loadAuthenticatedContext(token: string): Promise<AuthContext> {
  if (await tokenService.isAccessTokenRevoked(token)) {
    throw new HttpError(401, 'Authentication token has been revoked');
  }

  const payload = verifyAccessToken(token);
  const cacheKey = `user:${payload.userId}`;
  let user: SanitizedUser | null = null;

  if (cache.isConnectedToRedis()) {
    const cached = await cache.get<SanitizedUser>(cacheKey);
    if (cached) {
      user = toAuthenticatedUser(cached);
    }
  }

  if (!user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: USER_SELECT,
    });

    if (!dbUser) {
      throw new HttpError(401, 'User could not be found');
    }

    user = toAuthenticatedUser(dbUser);

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, user, 60 * 60);
    }
  }

  if (!user) {
    throw new HttpError(401, 'User could not be found');
  }

  return { payload, user };
}

async function loadContextFromRequest(
  req: AuthenticatedRequest
): Promise<AuthContext | null> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  const token = header.replace('Bearer ', '').trim();
  if (!token) {
    return null;
  }

  return loadAuthenticatedContext(token);
}

const normalizeOptions = (
  allowed?: GuardOptions
): { roles?: Role[]; permissions?: string[]; permissionMode: 'all' | 'any' } => {
  if (!allowed) return { permissionMode: 'all' };
  if (Array.isArray(allowed)) {
    return { roles: allowed, permissionMode: 'all' };
  }
  return { ...allowed, permissionMode: allowed.permissionMode ?? 'all' };
};

export const requireAuth =
  (allowed?: GuardOptions) =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const context = await loadContextFromRequest(req);
      if (!context) {
        throw new HttpError(401, 'Authentication token missing');
      }

      const { user, payload } = context;

      const guard = normalizeOptions(allowed);

      const hasRole = !guard.roles || guard.roles.some((role) => user.roles.includes(role));

      const hasPermission =
        !guard.permissions ||
        (guard.permissionMode === 'any'
          ? guard.permissions.some((permission) => user.permissions.includes(permission))
          : guard.permissions.every((permission) => user.permissions.includes(permission)));

      if (!hasRole || !hasPermission) {
        throw new HttpError(403, 'You do not have permission to access this resource');
      }

      req.user = user;
      req.auth = {
        ...payload,
        organizerId: user.organizerId ?? null,
        roles: user.roles,
        permissions: user.permissions,
      };

      next();
    } catch (error) {
      next(error);
    }
  };

export const optionalAuth =
  () =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const context = await loadContextFromRequest(req);
      if (!context) {
        next();
        return;
      }

      const { user, payload } = context;

      req.user = user;
      req.auth = {
        ...payload,
        organizerId: user.organizerId ?? null,
        roles: user.roles,
        permissions: user.permissions,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
