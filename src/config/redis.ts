import { env } from './env';

// Detect local Docker / dev Redis (no auth needed)
const isLocal = env.REDIS_HOST === 'redis' || env.REDIS_HOST === 'localhost' || env.REDIS_HOST === '127.0.0.1';

export const redisConnection = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: (env.REDIS_PASSWORD && !isLocal) ? env.REDIS_USERNAME : undefined,
    password: (env.REDIS_PASSWORD && !isLocal) ? env.REDIS_PASSWORD : undefined,
    maxRetriesPerRequest: null,
    ...(env.REDIS_USE_TLS ? { tls: {} } : {}),
};

console.log(`[redis] config → host=${env.REDIS_HOST} port=${env.REDIS_PORT} auth=${!!env.REDIS_PASSWORD && !isLocal} tls=${!!env.REDIS_USE_TLS}`);