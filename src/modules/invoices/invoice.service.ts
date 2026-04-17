import { db } from '../../config/db';
import { AppError } from '../../middlewares/error.middleware';
import type { CreateInvoiceInput, UpdateInvoiceItemsInput, ListInvoicesQuery } from './invoice.schemas';
import type { InvoiceDetail, InvoiceSummary, PaginatedResult } from '../../types/domain';
import { normalizePagination } from '../../utils/pagination';
import { calculateSubtotalPaise, calculateTotalPaise } from '../../utils/money';
import { ProductRepository } from '../products/product.repository';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceItemRepository } from './invoiceItem.repository';
import { assertInvoiceDraft, assertInvoiceTransition, assertProtectedActor } from './invoice.state';
import { enqueueInvoiceFinalizedJobs } from './invoice.queue';

function normalizeSelections(items: { productId: string; quantity: number }[]) {
  const map = new Map<string, number>();

  for (const item of items) {
    map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
  }

  return [...map.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

async function buildSnapshotItems(items: { productId: string; quantity: number }[]) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await ProductRepository.findByIds(productIds);

  if (products.length !== productIds.length) {
    throw new AppError('One or more products were not found', 404, 'PRODUCT_NOT_FOUND');
  }

  const productById = new Map(products.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = productById.get(item.productId);

    if (!product) {
      throw new AppError('One or more products were not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (item.quantity > product.availableQuantity) {
      throw new AppError(
        'Not enough stock for ' + product.name + '. Requested ' + item.quantity + ', available ' + product.availableQuantity,
        409,
        'INSUFFICIENT_STOCK'
      );
    }

    const lineTotalPaise = item.quantity * product.unitPricePaise;

    return {
      productId: product.id,
      productNameSnapshot: product.name,
      productSkuSnapshot: product.sku,
      unitPricePaiseSnapshot: product.unitPricePaise,
      quantity: item.quantity,
      lineTotalPaise,
    };
  });
}

function calculateTotals(items: Array<{ quantity: number; unitPricePaiseSnapshot: number; lineTotalPaise: number }>) {
  const subtotalPaise = calculateSubtotalPaise(
    items.map((item) => ({ quantity: item.quantity, unitPricePaise: item.unitPricePaiseSnapshot }))
  );

  const taxPaise = 0;
  const totalPaise = calculateTotalPaise(subtotalPaise, taxPaise);

  return { subtotalPaise, taxPaise, totalPaise };
}

function mapDetail(invoice: any, items: any[]): InvoiceDetail {
  return {
    ...invoice,
    notes: invoice.notes,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot,
      productSku: item.productSkuSnapshot,
      unitPricePaise: item.unitPricePaiseSnapshot,
      quantity: item.quantity,
      lineTotalPaise: item.lineTotalPaise,
    })),
  };
}

async function loadInvoiceDetail(invoiceId: string): Promise<InvoiceDetail | null> {
  return db.transaction(async (tx) => {
    const invoice = await InvoiceRepository.findById(tx, invoiceId);
    if (!invoice) return null;

    const items = await InvoiceItemRepository.findByInvoiceId(tx, invoiceId);
    return mapDetail(invoice, items);
  });
}

export const InvoiceService = {
  async createDraftInvoice(input: CreateInvoiceInput, actorId: string): Promise<InvoiceDetail> {
    const selections = normalizeSelections(input.items);
    const snapshotItems = await buildSnapshotItems(selections);
    const totals = calculateTotals(snapshotItems);

    return db.transaction(async (tx) => {
      const invoice = await InvoiceRepository.createDraftInvoice(tx, {
        customerName: input.customerName,
        notes: input.notes || null,
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        createdBy: actorId,
        updatedBy: actorId,
      });

      if (!invoice) {
        throw new AppError('Failed to create invoice', 500, 'INVOICE_CREATE_FAILED');
      }

      await InvoiceItemRepository.insertMany(
        tx,
        snapshotItems.map((item) => ({
          invoiceId: invoice.id,
          ...item,
        }))
      );

      const items = await InvoiceItemRepository.findByInvoiceId(tx, invoice.id);
      return mapDetail(invoice, items);
    });
  },

  async updateDraftInvoiceItems(invoiceId: string, input: UpdateInvoiceItemsInput, actorId: string): Promise<InvoiceDetail> {
    const selections = normalizeSelections(input.items);
    const snapshotItems = await buildSnapshotItems(selections);
    const totals = calculateTotals(snapshotItems);

    return db.transaction(async (tx) => {
      const invoice = await InvoiceRepository.findById(tx, invoiceId);
      if (!invoice) throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      assertInvoiceDraft(invoice.status);

      await InvoiceItemRepository.deleteByInvoiceId(tx, invoiceId);
      await InvoiceItemRepository.insertMany(
        tx,
        snapshotItems.map((item) => ({
          invoiceId,
          ...item,
        }))
      );

      const updatedInvoice = await InvoiceRepository.updateDraftTotals(tx, {
        invoiceId,
        expectedVersion: invoice.version,
        totals,
        actorId,
      });

      if (!updatedInvoice) {
        throw new AppError('Invoice changed while updating. Please retry.', 409, 'INVOICE_CONCURRENT_UPDATE');
      }

      const latestItems = await InvoiceItemRepository.findByInvoiceId(tx, invoiceId);
      return mapDetail(updatedInvoice, latestItems);
    });
  },

  async finalizeInvoice(invoiceId: string, actorId?: string): Promise<InvoiceDetail> {
    assertProtectedActor(actorId);

    const finalized = await db.transaction(async (tx) => {
      const invoice = await InvoiceRepository.findById(tx, invoiceId);
      if (!invoice) throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      assertInvoiceDraft(invoice.status);

      const sequenceValue = await InvoiceRepository.nextInvoiceSequence(tx);
      const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + String(sequenceValue).padStart(6, '0');

      const updatedInvoice = await InvoiceRepository.transitionStatus(tx, {
        invoiceId,
        expectedVersion: invoice.version,
        fromStatus: 'DRAFT',
        toStatus: 'FINALIZED',
        actorId,
        invoiceNumber,
        finalizedAt: new Date(),
      });

      if (!updatedInvoice) {
        throw new AppError('Invoice was already modified. Please retry.', 409, 'INVOICE_CONCURRENT_FINALIZE');
      }

      const items = await InvoiceItemRepository.findByInvoiceId(tx, invoiceId);
      return { invoice: updatedInvoice, items };
    });

    try {
      await enqueueInvoiceFinalizedJobs({
        invoiceId: finalized.invoice.id,
        invoiceNumber: finalized.invoice.invoiceNumber ?? 'UNKNOWN',
      });
    } catch (error) {
      console.error('Failed to enqueue invoice jobs:', error);
    }

    return mapDetail(finalized.invoice, finalized.items);
  },

  async markInvoicePaid(invoiceId: string, actorId?: string): Promise<InvoiceDetail> {
    assertProtectedActor(actorId);

    return db.transaction(async (tx) => {
      const invoice = await InvoiceRepository.findById(tx, invoiceId);
      if (!invoice) throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      assertInvoiceTransition(invoice.status, 'PAID');

      const updated = await InvoiceRepository.transitionStatus(tx, {
        invoiceId,
        expectedVersion: invoice.version,
        fromStatus: 'FINALIZED',
        toStatus: 'PAID',
        actorId,
        paidAt: new Date(),
      });

      if (!updated) {
        throw new AppError('Invoice changed while marking paid. Please retry.', 409, 'INVOICE_CONCURRENT_PAY');
      }

      const items = await InvoiceItemRepository.findByInvoiceId(tx, invoiceId);
      return mapDetail(updated, items);
    });
  },

  async voidInvoice(invoiceId: string, actorId?: string): Promise<InvoiceDetail> {
    assertProtectedActor(actorId);

    return db.transaction(async (tx) => {
      const invoice = await InvoiceRepository.findById(tx, invoiceId);
      if (!invoice) throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      assertInvoiceTransition(invoice.status, 'VOID');

      const updated = await InvoiceRepository.transitionStatus(tx, {
        invoiceId,
        expectedVersion: invoice.version,
        fromStatus: 'FINALIZED',
        toStatus: 'VOID',
        actorId,
        voidedAt: new Date(),
      });

      if (!updated) {
        throw new AppError('Invoice changed while voiding. Please retry.', 409, 'INVOICE_CONCURRENT_VOID');
      }

      const items = await InvoiceItemRepository.findByInvoiceId(tx, invoiceId);
      return mapDetail(updated, items);
    });
  },

  async getInvoiceDetail(invoiceId: string) {
    return loadInvoiceDetail(invoiceId);
  },

  async listInvoices(query: ListInvoicesQuery): Promise<PaginatedResult<InvoiceSummary>> {
    const pag = normalizePagination(query.page, query.limit);
    return InvoiceRepository.list(db, { page: pag.page, limit: pag.limit, offset: pag.offset, status: query.status, q: query.q });
  },
};
