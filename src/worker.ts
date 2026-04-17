import { pool } from './config/db';
import { ensureDatabaseBootstrap } from './db/bootstrap';
import { startInvoiceWorker } from './workers/invoice.worker';

async function start() {
  await ensureDatabaseBootstrap();

  const worker = startInvoiceWorker();

  async function shutdown(signal: string) {
    console.log('Received ' + signal + ', shutting down worker...');
    await worker.close();
    await pool.end();
    process.exit(0);
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void start().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
