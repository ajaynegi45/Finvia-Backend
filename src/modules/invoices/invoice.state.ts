import { AppError } from '../../middlewares/error.middleware';
import type { InvoiceStatus } from '../../types/domain';

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['FINALIZED'],
  FINALIZED: ['PAID', 'VOID'],
  PAID: [],
  VOID: [],
};

export function assertInvoiceTransition(from: InvoiceStatus, to: InvoiceStatus) {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new AppError('Invalid invoice transition: ' + from + ' -> ' + to, 409, 'INVALID_TRANSITION');
  }
}

export function assertInvoiceDraft(status: InvoiceStatus) {
  if (status !== 'DRAFT') {
    throw new AppError('Only draft invoices can be edited', 409, 'INVOICE_NOT_DRAFT');
  }
}

export function assertProtectedActor(actorId?: string): asserts actorId is string {
  if (!actorId) {
    throw new AppError('Missing actor id', 401, 'UNAUTHORIZED');
  }
}
