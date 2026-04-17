import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_MIGRATION_URL: z.string().min(1).optional(),
    DATABASE_REQUIRE_SSL: z.coerce.boolean().default(false),
    REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_USERNAME: z.string().default('default'),
    REDIS_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);
