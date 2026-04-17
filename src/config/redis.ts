import { env } from './env';
import type { ConnectionOptions } from 'bullmq';

export const redisConnection: ConnectionOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    // Only provide username/password if a password exists. 
    // This allows seamless fallback to passwordless local Redis.
    username: env.REDIS_PASSWORD ? env.REDIS_USERNAME : undefined,
    password: env.REDIS_PASSWORD || undefined,
    
    // Required for BullMQ to avoid connection stalls
    maxRetriesPerRequest: null,
    
    // Support TLS (required for most managed Redis instances like Redis Cloud)
    ...(env.REDIS_USE_TLS ? { tls: {} } : {}),
    
    // Fail fast during connection setup errors to avoid silent hangs
    enableReadyCheck: false,
};