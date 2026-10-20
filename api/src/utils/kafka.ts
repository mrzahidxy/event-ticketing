import { Kafka, logLevel, Partitioners } from 'kafkajs';

import type { DomainEvent } from '../types/domain-event';
import { env } from './env';
import { logger } from './logger';

const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers: env.KAFKA_BROKERS.split(',').map((broker) => broker.trim()).filter(Boolean),
  connectionTimeout: 3000,
  requestTimeout: 5000,
  retry: { retries: 2 },
  logLevel: logLevel.ERROR,
  logCreator: () => ({ log }) => {
    logger.error({ kafka: log }, 'Kafka client error');
  },
});

const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
let connection: Promise<void> | undefined;

export const connectKafkaProducer = (): Promise<void> => {
  if (!connection) {
    connection = producer.connect().then(() => {
      logger.info('Kafka producer connected');
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
};

export const publishDomainEvent = async (event: DomainEvent): Promise<boolean> => {
  try {
    await connectKafkaProducer();
    await producer.send({
      topic: env.KAFKA_TOPIC_DOMAIN_EVENTS,
      messages: [{ key: event.tenantId, value: JSON.stringify(event) }],
      timeout: 5000,
    });
    return true;
  } catch (error) {
    // Business state is already committed. This MVP logs lost/uncertain delivery;
    // it has no outbox and cannot atomically commit PostgreSQL and Kafka.
    logger.error({
      err: error,
      eventType: event.eventType,
      tenantId: event.tenantId,
      entityId: event.eventType === 'booking.created' ? event.data.bookingId : event.data.checkInId,
      topic: env.KAFKA_TOPIC_DOMAIN_EVENTS,
    }, 'Domain event publication failed after business commit');
    return false;
  }
};

export const disconnectKafkaProducer = async (): Promise<void> => {
  if (connection) {
    await connection.catch(() => undefined);
  }
  await producer.disconnect();
  connection = undefined;
};
