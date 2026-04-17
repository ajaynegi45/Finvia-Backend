import { Worker, type Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { INVOICE_QUEUE_NAME } from '../modules/invoices/invoice.queue';

async function simulateWork(label: string, invoiceNumber: string) {
  console.log('[worker] ' + label + ' started for ' + invoiceNumber);
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log('[worker] ' + label + ' completed for ' + invoiceNumber);
}

async function processJob(job: Job<{ invoiceId: string; invoiceNumber: string }>) {
  console.log('[worker] processing job ' + job.name + ' (' + job.id + ') attempt ' + (job.attemptsMade + 1));

  if (job.name === 'invoice.generate-pdf') {
    await simulateWork('PDF generation', job.data.invoiceNumber);
    return { ok: true, type: 'pdf' };
  }

  if (job.name === 'invoice.send-email') {
    await simulateWork('Email dispatch', job.data.invoiceNumber);
    return { ok: true, type: 'email' };
  }

  throw new Error('Unknown job type: ' + job.name);
}

export function startInvoiceWorker() {
  const worker = new Worker(INVOICE_QUEUE_NAME, processJob, {
    connection: redisConnection,
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    console.log('[worker] completed job ' + job.name + ' (' + job.id + ')');
  });

  worker.on('failed', (job, error) => {
    console.error(
      '[worker] failed job ' + job?.name + ' (' + job?.id + ') attempt ' + ((job?.attemptsMade ?? 0) + 1) + ':',
      error
    );
  });

  console.log('[worker] invoice worker started');
  return worker;
}
