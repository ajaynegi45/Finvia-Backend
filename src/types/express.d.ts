import 'express-serve-static-core';
import type { InvoiceCreateInput, InvoiceUpdateItemsInput } from './domain';

declare module 'express-serve-static-core' {
  interface Request {
    actorId?: string;
    actorRole?: string;
    validatedBody?: InvoiceCreateInput | InvoiceUpdateItemsInput | Record<string, unknown>;
    validatedParams?: { invoiceId?: string };
    validatedQuery?: Record<string, unknown>;
  }
}
