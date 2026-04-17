import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from './env';

const ssl = env.DATABASE_REQUIRE_SSL
    ? {
        rejectUnauthorized: false,
    }
    : undefined;

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
    process.exit(1);
});

export const db = drizzle(pool);
