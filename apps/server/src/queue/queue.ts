import { Queue, QueueEvents } from "bullmq";
import { createRedisConnection } from "./connection.js";

const QUEUE_NAME = "card-generation";

export const cardQueue = new Queue(QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    attempts: 1,
  },
});

export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: createRedisConnection(),
});

export function getQueueName(): string {
  return QUEUE_NAME;
}
