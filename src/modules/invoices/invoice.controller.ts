import type { Request, Response } from 'express';
import { AppError } from '../../middlewares/error.middleware';
import { ok } from '../../utils/response';
import type { CreateInvoiceInput, UpdateInvoiceItemsInput, ListInvoicesQuery } from './invoice.schemas';
import { InvoiceService } from './invoice.service';

function getActor(req: Request) {
  if (!req.actorId || !req.actorRole) {
    throw new AppError('Authenticated user is missing', 401, 'UNAUTHORIZED');
  }

  return {
    actorId: req.actorId,
    actorRole: req.actorRole,
  };
}

export async function createInvoiceHandler(req: Request, res: Response) {
  if (!req.validatedBody) throw new AppError('Validated body is missing', 500);
  const actor = getActor(req);
  const data = await InvoiceService.createDraftInvoice(req.validatedBody as CreateInvoiceInput, actor);
  res.status(201).json(ok(data));
}

export async function updateInvoiceItemsHandler(req: Request, res: Response) {
  if (!req.validatedBody || !req.validatedParams?.invoiceId) throw new AppError('Validated request data is missing', 500);
  const actor = getActor(req);
  const data = await InvoiceService.updateDraftInvoiceItems(
    req.validatedParams.invoiceId as string,
    req.validatedBody as UpdateInvoiceItemsInput,
    actor
  );
  res.status(200).json(ok(data));
}

export async function getInvoiceHandler(req: Request, res: Response) {
  if (!req.validatedParams?.invoiceId) throw new AppError('Validated params are missing', 500);
  const data = await InvoiceService.getInvoiceDetail(req.validatedParams.invoiceId as string);
  if (!data) throw new AppError('Invoice not found', 404);
  res.status(200).json(ok(data));
}

export async function listInvoicesHandler(req: Request, res: Response) {
  if (!req.validatedQuery) throw new AppError('Validated query is missing', 500);
  const data = await InvoiceService.listInvoices(req.validatedQuery as ListInvoicesQuery);
  res.status(200).json(ok(data.data, data.meta));
}

export async function finalizeInvoiceHandler(req: Request, res: Response) {
  if (!req.validatedParams?.invoiceId) throw new AppError('Validated params are missing', 500);
  const actor = getActor(req);
  const data = await InvoiceService.finalizeInvoice(req.validatedParams.invoiceId as string, actor);
  res.status(200).json(ok(data));
}

export async function markPaidHandler(req: Request, res: Response) {
  if (!req.validatedParams?.invoiceId) throw new AppError('Validated params are missing', 500);
  const actor = getActor(req);
  const data = await InvoiceService.markInvoicePaid(req.validatedParams.invoiceId as string, actor);
  res.status(200).json(ok(data));
}

export async function voidInvoiceHandler(req: Request, res: Response) {
  if (!req.validatedParams?.invoiceId) throw new AppError('Validated params are missing', 500);
  const actor = getActor(req);
  const data = await InvoiceService.voidInvoice(req.validatedParams.invoiceId as string, actor);
  res.status(200).json(ok(data));
}
