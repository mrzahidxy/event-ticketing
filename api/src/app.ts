import compression from 'compression';
import cors, { CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import routes from './routes';
import { paymentWebhookRouter } from './routes/payment.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { env } from './utils/env';
import { httpLogger, logger, loggerWithRequestContext } from './utils/logger';
import { prisma } from './utils/prisma';
import { cache } from './utils/cache';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { serve, setup, swaggerSpec, swaggerUiOptions } from './middleware/swagger.middleware';

const app = express();

const trustProxySetting = env.TRUST_PROXY ? 1 : false;
app.set('trust proxy', trustProxySetting);

// Request/response tracing
app.use(requestIdMiddleware);
app.use(loggerWithRequestContext);
app.use(httpLogger);
app.use(cookieParser());

// Security and performance middleware
const limiterOptions: Partial<RateLimitOptions> & { trustProxy?: boolean } = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: Boolean(trustProxySetting),
};

const limiter = rateLimit(limiterOptions);
const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions: CorsOptions = {
  origin: corsOrigins.length === 0 || corsOrigins.includes('*') ? true : corsOrigins,
  credentials: true,
};

app.use(limiter);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use('/api/payments', paymentWebhookRouter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.get('/health', async (_req, res) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const services: { database: 'up' | 'down'; cache: 'up' | 'down' | 'disabled' } = {
    database: 'up',
    cache: !env.REDIS_URL ? 'disabled' : cache.isConnectedToRedis() ? 'up' : 'down',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    services.database = 'down';
    res.status(503).json({
      status: 'error',
      timestamp,
      uptime,
      services,
      error: 'Database connection failed',
    });
    return;
  }

  const status = services.cache === 'down' ? 'degraded' : 'ok';

  res.status(200).json({
    status,
    timestamp,
    uptime,
    services,
  });
});

// Swagger documentation
app.use('/api-docs', serve, setup(swaggerSpec, swaggerUiOptions));

// API routes
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});

export default app;
