import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { isHttpError } from '../utils/http-error';
import { logger } from '../utils/logger';

const publicDetailsFor = (details: unknown, statusCode: number) => {
  if (!details || details instanceof Error) {
    return undefined;
  }

  return statusCode === 400 ? details : undefined;
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isHttpError(error)) {
    const details = publicDetailsFor(error.details, error.statusCode);

    logger.warn(
      {
        statusCode: error.statusCode,
        message: error.message,
        details: error.details,
      },
      'Handled http error'
    );

    return res.status(error.statusCode).json({
      message: error.message,
      ...(details ? { details } : {}),
    });
  }

  if (error instanceof ZodError) {
    logger.warn({ issues: error.issues }, 'Validation error');
    return res.status(400).json({
      message: 'Validation failed',
      details: error.flatten(),
    });
  }

  if (error instanceof Error) {
    logger.error({ err: error, stack: error.stack }, 'Unhandled error');
  } else {
    logger.error({ error }, 'Unhandled error');
  }
  return res.status(500).json({
    message: 'Internal server error',
  });
};
