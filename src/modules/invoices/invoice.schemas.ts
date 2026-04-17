import { z } from 'zod';

export const invoiceIdParamSchema = z.object({
  invoiceId: z.uuid(),
});

export const invoiceItemInputSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const createInvoiceSchema = z.object({
  customerName: z.string().trim().min(1).max(255),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(invoiceItemInputSchema).min(1, 'At least one line item is required'),
});

export const updateInvoiceItemsSchema = z.object({
  items: z.array(invoiceItemInputSchema).min(1, 'At least one line item is required'),
});

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['DRAFT', 'FINALIZED', 'PAID', 'VOID']).optional(),
  q: z.string().trim().min(1).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceItemsInput = z.infer<typeof updateInvoiceItemsSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
