import type { Request, Response } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import { ok } from '../../utils/response';
import type { CreateInvoiceInput, UpdateInvoiceItemsInput, ListInvoicesQuery } from './invoice.schemas';
import { InvoiceService } from './invoice.service';

export async function createInvoiceHandler(req: Request, res: Response) {
  if (!req.validatedBody) throw new AppError('Validated body is missing', 500);
  const data = await InvoiceService.createDraftInvoice(req.validatedBody as CreateInvoiceInput, req.actorId ?? 'anonymous');
  res.status(201).json(ok(data));
}

export async function updateInvoiceItemsHandler(req: Request, res: Response) {
  if (!req.validatedBody || !req.validatedParams?.invoiceId) throw new AppError('Validated request data is missing', 500);
  const data = await InvoiceService.updateDraftInvoiceItems(
    req.validatedParams.invoiceId,
    req.validatedBody as UpdateInvoiceItemsInput,
    req.actorId ?? 'anonymous'
  );
  res.status(200).json(ok(data));
}

export async function getInvoiceHandler(req: Request, res: Response) {
  if (!req.validatedParams?.invoiceId) throw new AppError('Validated params are missing', 500);
  const data = await InvoiceService.getInvoiceDetail(req.validatedParams.invoiceId);
  if (!data) throw new AppError('Invoice not found', 404);
  res.status(200).json(ok(data));
}

export async function listInvoicesHandler(req: Request, res: Response) {
  if (!req.validatedQuery) throw new AppError('Validated query is missing', 500);
  const data = await InvoiceService.listInvoices(req.validatedQuery as ListInvoicesQuery);
  res.status(200).json(ok(data.data, data.meta));
}
