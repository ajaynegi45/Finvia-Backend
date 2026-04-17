import { env } from './env';
import type { ConnectionOptions } from 'bullmq';

// Force local connections to be password-free (internal Docker service)
const isLocal = env.REDIS_HOST === 'redis' || env.REDIS_HOST === 'localhost' || env.REDIS_HOST === '127.0.0.1';

export const redisConnection: ConnectionOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    // Only provide username/password if a password exists AND we are not in a local context.
    // This solves the issue where .env passwords for cloud are incorrectly used for docker.
    username: (env.REDIS_PASSWORD && !isLocal) ? env.REDIS_USERNAME : undefined,
    password: (env.REDIS_PASSWORD && !isLocal) ? env.REDIS_PASSWORD : undefined,
    
    // Required for BullMQ to avoid connection stalls
    maxRetriesPerRequest: null,
    
    // Support TLS (required for most managed Redis instances like Redis Cloud)
    ...(env.REDIS_USE_TLS ? { tls: {} } : {}),
    
    // Fail fast during connection setup errors to avoid silent hangs
    enableReadyCheck: false,
};