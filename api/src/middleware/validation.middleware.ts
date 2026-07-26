import { type NextFunction, type Request, type Response } from 'express';
import { ZodTypeAny } from 'zod';
import xss from 'xss';

import { HttpError } from '../utils/http-error';

type RequestProperty = 'body' | 'query' | 'params';

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return xss(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== 'object' || value instanceof Date) {
    return value;
  }

  return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, sanitizeValue(val)]));
};

export const validateRequest =
  <T extends ZodTypeAny>(schema: T, property: RequestProperty = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(sanitizeValue(req[property]));

    if (!result.success) {
      next(new HttpError(400, 'Validation failed', result.error.flatten()));
      return;
    }

    if (property === 'query') {
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      (req as Request & Record<RequestProperty, unknown>)[property] = result.data;
    }

    next();
  };
