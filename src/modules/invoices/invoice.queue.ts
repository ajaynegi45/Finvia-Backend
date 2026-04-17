import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis';

export const INVOICE_QUEUE_NAME = 'invoice-jobs';

export const invoiceQueue = new Queue(INVOICE_QUEUE_NAME, {
  connection: redisConnection,
});

export async function enqueueInvoiceFinalizedJobs(payload: { invoiceId: string; invoiceNumber: string }) {
  const baseJobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  };

  await Promise.all([
    invoiceQueue.add('invoice.generate-pdf', payload, {
      ...baseJobOptions,
      jobId: 'pdf:' + payload.invoiceId,
    }),
    invoiceQueue.add('invoice.send-email', payload, {
      ...baseJobOptions,
      jobId: 'email:' + payload.invoiceId,
    }),
  ]);
}
