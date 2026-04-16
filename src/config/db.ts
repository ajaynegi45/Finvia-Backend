import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from './env';

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
});

pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
    process.exit(1);
});

export const db = drizzle(pool);