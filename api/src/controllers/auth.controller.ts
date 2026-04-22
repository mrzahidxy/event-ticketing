import { Request, Response } from 'express';

import { authService } from '../services/auth.service';
import type { AuthenticatedRequest } from '../types/http';
import { successResponse } from '../utils/api-response';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../utils/auth-cookies';
import { env } from '../utils/env';

const getBearerToken = (authorizationHeader?: string): string | undefined => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorizationHeader.slice('Bearer '.length).trim() || undefined;
};

export const authController = {
  register: async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.register(req.body);

    setRefreshTokenCookie(res, result.refreshToken.token, result.refreshToken.expiresAt);

    res.status(201).json(
      successResponse(
        {
          accessToken: result.accessToken,
          accessTokenExpiresAt: result.accessTokenExpiresAt,
          refreshTokenExpiresAt: result.refreshToken.expiresAt,
          user: result.user,
        },
        { message: 'Registration successful' }
      )
    );
  },

  login: async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.login(req.body);

    setRefreshTokenCookie(res, result.refreshToken.token, result.refreshToken.expiresAt);

    res.status(200).json(
      successResponse(
        {
          accessToken: result.accessToken,
          accessTokenExpiresAt: result.accessTokenExpiresAt,
          refreshTokenExpiresAt: result.refreshToken.expiresAt,
          user: result.user,
        },
        { message: 'Login successful' }
      )
    );
  },

  refresh: async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
    const currentAccessToken = getBearerToken(req.headers.authorization);
    const result = await authService.refreshSession(refreshToken, currentAccessToken);

    setRefreshTokenCookie(res, result.refreshToken.token, result.refreshToken.expiresAt);

    res.status(200).json(
      successResponse(
        {
          accessToken: result.accessToken,
          accessTokenExpiresAt: result.accessTokenExpiresAt,
          refreshTokenExpiresAt: result.refreshToken.expiresAt,
          user: result.user,
        },
        { message: 'Session refreshed' }
      )
    );
  },

  logout: async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
    const currentAccessToken = getBearerToken(req.headers.authorization);
    await authService.logout(refreshToken, currentAccessToken);
    clearRefreshTokenCookie(res);
    res.status(204).send();
  },

  me: async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.getProfile(req.user!.id);
    res.status(200).json(successResponse(user));
  },
};
