import { CookieOptions, Response } from 'express';

import { env } from './env';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: env.REFRESH_TOKEN_COOKIE_PATH,
  domain: env.COOKIE_DOMAIN || undefined,
};

export const setRefreshTokenCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie(env.REFRESH_TOKEN_COOKIE_NAME, token, {
    ...baseCookieOptions,
    expires: expiresAt,
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    ...baseCookieOptions,
    expires: new Date(0),
  });
};
