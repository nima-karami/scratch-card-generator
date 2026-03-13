import { Redis } from "ioredis";
import { config } from "../config.js";

/**
 * Create a Redis connection for BullMQ (queue and worker each need their own connection).
 */
export function createRedisConnection(): Redis {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
  });
}
