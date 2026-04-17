import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis';

export const INVOICE_QUEUE_NAME = 'invoice-jobs';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 24 * 3600,
    count: 1000,
  },
};

export const invoiceQueue = new Queue(INVOICE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions,
});

export async function enqueueInvoiceFinalizedJobs(payload: { invoiceId: string; invoiceNumber: string }) {
  await Promise.all([
    invoiceQueue.add('invoice.generate-pdf', payload, {
      ...defaultJobOptions,
      jobId: 'pdf:' + payload.invoiceId,
    }),
    invoiceQueue.add('invoice.send-email', payload, {
      ...defaultJobOptions,
      jobId: 'email:' + payload.invoiceId,
    }),
  ]);
}
