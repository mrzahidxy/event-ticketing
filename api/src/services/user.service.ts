import { Prisma, Role } from '@prisma/client';

import {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UpdateUserRoleInput,
} from '../schemas/user.schema';
import { AuthenticatedUser, SanitizedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { cache } from '../utils/cache';
import { hashPassword } from '../utils/password';
import { logger } from '../utils/logger';
import { resolvePermissions } from '../config/rbac';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const USER_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type UserListItem = SanitizedUser;

type UserDetail = UserListItem;

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

const withOrganizerId = <T extends object>(
  user: T
): Omit<T, 'ownedOrganizer'> & { organizerId: string | null; organizerName: string | null } => {
  const { ownedOrganizer, ...rest } = user as T & {
    ownedOrganizer?: { id: string; name: string } | null;
  };

  return {
    ...(rest as Omit<T, 'ownedOrganizer'>),
    organizerId: ownedOrganizer?.id ?? null,
    organizerName: ownedOrganizer?.name ?? null,
  };
};

const normalizePagination = (page: number, limit: number) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

const normalizeQuery = (
  query: ListUsersQuery | undefined
): {
  where: Prisma.UserWhereInput;
  page?: number;
  limit?: number;
} => {
  const where: Prisma.UserWhereInput = {};

  if (query?.role) {
    where.role = query.role;
  }

  if (query?.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { name: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return {
    where,
    page: query?.page,
    limit: query?.limit,
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
      name: true,
    },
  },
} as const;

const cacheKeyForUser = (userId: number) => `user:${userId}`;

const getOwnedOrganizer = async (userId: number) =>
  prisma.organizer.findUnique({
    where: { ownerId: userId },
    select: {
      id: true,
      name: true,
    },
  });

export const userService = {
  list: async (
    actor: AuthenticatedUser,
    query?: ListUsersQuery
  ): Promise<PaginatedResponse<UserListItem>> => {
    if (actor.role !== Role.ADMIN) {
      throw new HttpError(403, 'You do not have permission to list users');
    }

    try {
      const { where, page, limit } = normalizeQuery(query);
      const { page: currentPage, limit: currentLimit } = normalizePagination(
        page ?? DEFAULT_PAGE,
        limit ?? DEFAULT_LIMIT
      );

      const skip = (currentPage - 1) * currentLimit;

      const [users, totalItems] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          select: USER_SELECT,
          skip,
          take: currentLimit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / currentLimit);

      const sanitizedUsers = users.map((user) => sanitizeUser(withOrganizerId(user)));

      return {
        data: sanitizedUsers,
        meta: {
          page: currentPage,
          limit: currentLimit,
          totalItems,
          totalPages,
        },
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to list users');
      throw error;
    }
  },

  getById: async (userId: number, actor: AuthenticatedUser): Promise<UserDetail> => {
    if (actor.role !== Role.ADMIN && actor.id !== userId) {
      throw new HttpError(403, 'You do not have permission to view this user');
    }

    const cacheKey = cacheKeyForUser(userId);

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<SanitizedUser>(cacheKey);
      if (cached) {
        return { ...cached, roles: cached.roles ?? [cached.role] };
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    const sanitized = sanitizeUser(withOrganizerId(user));

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, sanitized, USER_CACHE_TTL_SECONDS);
    }

    return sanitized;
  },

  create: async (
    input: CreateUserInput,
    actor: AuthenticatedUser
  ): Promise<SanitizedUser> => {
    if (actor.role !== Role.ADMIN) {
      throw new HttpError(403, 'You do not have permission to create users');
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new HttpError(409, 'A user with this email already exists');
    }

    const roleToAssign = input.role ?? Role.USER;

    const passwordHash = await hashPassword(input.password);
    const permissionsToAssign = resolvePermissions(roleToAssign, input.permissions);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: roleToAssign,
        permissions: permissionsToAssign,
      },
    });

    if (cache.isConnectedToRedis()) {
      await cache.set(
        cacheKeyForUser(user.id),
        sanitizeUser(withOrganizerId(user)),
        USER_CACHE_TTL_SECONDS
      );
    }

    return sanitizeUser(withOrganizerId(user));
  },

  update: async (
    userId: number,
    input: UpdateUserInput,
    actor: AuthenticatedUser
  ): Promise<UserDetail> => {
    if (actor.role !== Role.ADMIN && actor.id !== userId) {
      throw new HttpError(403, 'You do not have permission to update this user');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new HttpError(404, 'User not found');
    }

    if (input.email && input.email !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: input.email } });
      if (duplicate) {
        throw new HttpError(409, 'A user with this email already exists');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        email: input.email ?? existing.email,
        name: input.name === undefined ? existing.name : input.name,
      },
      select: USER_SELECT,
    });

    const sanitized = sanitizeUser(withOrganizerId(updated));

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKeyForUser(userId), sanitized, USER_CACHE_TTL_SECONDS);
    }

    return sanitized;
  },

  updateRole: async (
    userId: number,
    input: UpdateUserRoleInput,
    actor: AuthenticatedUser
  ): Promise<UserDetail> => {
    if (actor.role !== Role.ADMIN) {
      throw new HttpError(403, 'You do not have permission to update user roles');
    }

    if (actor.id === userId) {
      throw new HttpError(400, 'You cannot change your own role');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new HttpError(404, 'User not found');
    }

    if (input.role !== Role.OWNER) {
      const ownedOrganizer = await getOwnedOrganizer(userId);

      if (ownedOrganizer) {
        throw new HttpError(
          409,
          `Cannot change the role of organizer owner "${ownedOrganizer.name}". Reassign or remove the organizer first.`
        );
      }
    }

    const permissions = resolvePermissions(input.role, input.permissions);
    const existingPermissions = resolvePermissions(existing.role, (existing as any).permissions);
    const permissionsMatch =
      existing.role === input.role &&
      existingPermissions.length === permissions.length &&
      permissions.every((permission) => existingPermissions.includes(permission));

    if (existing.role === input.role && permissionsMatch) {
      const current = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: USER_SELECT,
      });

      const sanitizedCurrent = sanitizeUser(withOrganizerId(current));

      if (cache.isConnectedToRedis()) {
        await cache.set(cacheKeyForUser(userId), sanitizedCurrent, USER_CACHE_TTL_SECONDS);
      }

      return sanitizedCurrent;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: input.role,
        permissions,
      },
      select: USER_SELECT,
    });

    const sanitized = sanitizeUser(withOrganizerId(updated));

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKeyForUser(userId), sanitized, USER_CACHE_TTL_SECONDS);
    }

    return sanitized;
  },

  remove: async (userId: number, actor: AuthenticatedUser): Promise<void> => {
    if (actor.role !== Role.ADMIN) {
      throw new HttpError(403, 'You do not have permission to delete users');
    }

    if (actor.id === userId) {
      throw new HttpError(400, 'You cannot delete your own account');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new HttpError(404, 'User not found');
    }

    const ownedOrganizer = await getOwnedOrganizer(userId);
    if (ownedOrganizer) {
      throw new HttpError(
        409,
        `Cannot delete user because they own organizer "${ownedOrganizer.name}". Reassign or remove the organizer first.`
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    if (cache.isConnectedToRedis()) {
      await cache.del(cacheKeyForUser(userId));
    }
  },
};
