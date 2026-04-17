import { env } from './env';

export const redisConnection = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
};
