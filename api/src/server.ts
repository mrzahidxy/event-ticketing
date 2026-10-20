import http from 'http';

import app from './app';
import { env } from './utils/env';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { cache } from './utils/cache';
import { connectKafkaProducer, disconnectKafkaProducer } from './utils/kafka';

async function startServer(): Promise<void> {
  const server = http.createServer(app);
  let isShuttingDown = false;

  // Initialize cache
  cache.connect();
  void connectKafkaProducer().catch((error) => {
    logger.error({ err: error }, 'Kafka startup connection failed; business API remains available');
  });

  server.listen(env.PORT, env.HOST, () => {
    logger.info(`Server listening on http://${env.HOST}:${env.PORT}`);
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);

    const closeServer = async (): Promise<void> => {
      await new Promise<void>((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }

        server.close((error) => {
          if (error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') {
            reject(error);
            return;
          }

          resolve();
        });
      });
    };

    try {
      await closeServer();
    } catch (error) {
      logger.error({ error }, 'Error while closing HTTP server');
    }

    try {
      await prisma.$disconnect();
    } catch (error) {
      logger.error({ error }, 'Error while disconnecting Prisma');
    }

    try {
      await disconnectKafkaProducer();
    } catch (error) {
      logger.error({ err: error }, 'Error while disconnecting Kafka producer');
    }

    try {
      await cache.disconnect();
    } catch (error) {
      logger.error({ error }, 'Error while disconnecting cache');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((error) => {
  logger.error({ error }, 'Fatal error during server startup');
  process.exit(1);
});
