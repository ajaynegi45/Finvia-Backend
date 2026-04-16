import app from './app';
import { env } from './config/env';
import { pool } from './config/db';

const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
});

async function shutdown(signal: string) {
    console.log(`Received ${signal}, shutting down...`);

    server.close(async () => {
        try {
            await pool.end();
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));