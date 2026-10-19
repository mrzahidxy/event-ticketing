import { Kafka, logLevel } from 'kafkajs';

import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { analyticsDomainEventSchema, projectAnalyticsEvent } from './analytics-projection';

const consumer = new Kafka({
  clientId: `${env.KAFKA_CLIENT_ID}-consumer`,
  brokers: env.KAFKA_BROKERS.split(',').map((broker) => broker.trim()),
  connectionTimeout: 3000,
  requestTimeout: 5000,
  retry: { retries: 2, restartOnFailure: async () => false },
  logLevel: logLevel.ERROR,
  logCreator: () => ({ log }) => logger.error({ kafka: log }, 'Analytics Kafka client error'),
}).consumer({ groupId: env.KAFKA_ANALYTICS_GROUP_ID });

let stopping = false;
let shutdownPromise: Promise<void> | undefined;
const shutdown = (exitCode: number): Promise<void> => {
  process.exitCode = Math.max(process.exitCode ? Number(process.exitCode) : 0, exitCode);
  if (!shutdownPromise) {
    stopping = true;
    shutdownPromise = (async () => {
      try {
        await consumer.disconnect();
      } finally {
        await prisma.$disconnect();
      }
      logger.info('Analytics worker stopped');
    })().catch((err) => {
      process.exitCode = 1;
      logger.error({ err }, 'Analytics worker shutdown failed');
    });
  }
  return shutdownPromise;
};

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));
consumer.on(consumer.events.CRASH, ({ payload }) => {
  logger.error({ err: payload.error }, 'Analytics consumer failed; restart after resolving the failure');
  void shutdown(1);
});

const start = async () => {
  await consumer.connect();
  if (stopping) {
    await consumer.disconnect();
    return;
  }
  await consumer.subscribe({ topic: env.KAFKA_TOPIC_DOMAIN_EVENTS, fromBeginning: true });
  if (stopping) {
    await consumer.disconnect();
    return;
  }
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const context = { topic, partition, offset: message.offset };
      let input: unknown;
      try {
        input = JSON.parse(message.value?.toString('utf8') ?? '');
      } catch {
        logger.warn(context, 'Malformed analytics message: invalid JSON or empty value');
      }

      const validated = analyticsDomainEventSchema.safeParse(input);
      if (!validated.success) {
        logger.warn({ ...context, issues: validated.error.issues },
          'Unsupported or malformed analytics event; no database update');
      } else {
        try {
          const result = await projectAnalyticsEvent(prisma, validated.data);
          logger.info({ ...context, domainEventId: validated.data.domainEventId,
            eventType: validated.data.eventType, organizerId: validated.data.tenantId,
            eventId: validated.data.data.eventId, result }, 'Analytics projection completed');
        } catch (err) {
          logger.error({ ...context, err }, 'Analytics transaction failed; offset remains uncommitted');
          throw err;
        }
      }

      // Invalid messages are skipped; projection failures leave offsets uncommitted.
      await consumer.commitOffsets([{ topic, partition, offset: (BigInt(message.offset) + 1n).toString() }]);
    },
  });
  logger.info({ topic: env.KAFKA_TOPIC_DOMAIN_EVENTS, groupId: env.KAFKA_ANALYTICS_GROUP_ID },
    'Analytics worker consuming domain events');
};

void start().catch(async (err) => {
  logger.error({ err }, 'Analytics worker startup failed');
  await shutdown(1);
});
