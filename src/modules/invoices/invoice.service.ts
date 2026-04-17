import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { AppError } from '../../middlewares/error.middleware';
import type { CreateInvoiceInput, UpdateInvoiceItemsInput, ListInvoicesQuery } from './invoice.schemas';
import type { InvoiceDetail, InvoiceItemRecord, InvoiceSummary, PaginatedResult } from '../../types/domain';
import { normalizePagination } from '../../utils/pagination';
import { ProductRepository } from '../products/product.repository';
import { InvoiceRepository } from './invoice.repository';
import { invoices } from '../../db/schema/invoices';
import {invoiceItems } from '../../db/schema/invoiceItems';
import { mapInvoiceRow, mapItemRow } from './invoice.mapper';

function dedupeItems(items: UpdateInvoiceItemsInput['items']) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }
  return [...map.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function toItemRecord(row: typeof invoiceItems.$inferSelect): InvoiceItemRecord {
  return mapItemRow(row);
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
    if (!product.isActive) {
      throw new AppError(`Product ${product.sku} is inactive`, 409, 'PRODUCT_INACTIVE');
    }
    if (item.quantity > product.availableQuantity) {
      throw new AppError(
        `Not enough stock for ${product.name}. Requested ${item.quantity}, available ${product.availableQuantity}`,
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

function calculateTotals(items: Array<{ lineTotalPaise: number }>) {
  const subtotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const taxPaise = 0;
  const totalPaise = subtotalPaise + taxPaise;
  return { subtotalPaise, taxPaise, totalPaise };
}

export const InvoiceService = {
  async createDraftInvoice(input: CreateInvoiceInput, actorId: string): Promise<InvoiceDetail> {
    const snapshotItems = await buildSnapshotItems(input.items);
    const totals = calculateTotals(snapshotItems);

    return db.transaction(async (tx) => {
      const [invoice] = await tx.insert(invoices).values({
        customerName: input.customerName,
        notes: input.notes ?? null,
        status: 'DRAFT',
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        createdBy: actorId,
        updatedBy: actorId,
      }).returning();

      await tx.insert(invoiceItems).values(
        snapshotItems.map((item) => ({
          invoiceId: invoice.id,
          ...item,
        }))
      );

      const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)).orderBy(desc(invoiceItems.createdAt));

      return {
        ...mapInvoiceRow(invoice),
        notes: invoice.notes,
        updatedBy: invoice.updatedBy,
        items: items.map(toItemRecord),
      };
    });
  },

  async updateDraftInvoiceItems(invoiceId: string, input: UpdateInvoiceItemsInput, actorId: string): Promise<InvoiceDetail> {
    const normalizedItems = dedupeItems(input.items);
    const snapshotItems = await buildSnapshotItems(normalizedItems);
    const totals = calculateTotals(snapshotItems);

    return db.transaction(async (tx) => {
      const invoice = await InvoiceRepository.findById(invoiceId);
      if (!invoice) throw new AppError('Invoice not found', 404);
      if (invoice.status !== 'DRAFT') throw new AppError('Only draft invoices can be edited', 409, 'INVOICE_NOT_DRAFT');

      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
      await tx.insert(invoiceItems).values(
        snapshotItems.map((item) => ({ invoiceId, ...item }))
      );
      await tx.update(invoices).set({
        subtotalPaise: totals.subtotalPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        updatedBy: actorId,
        updatedAt: sql`NOW()`,
      }).where(eq(invoices.id, invoiceId));

      const refreshed = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
      const latestItems = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(desc(invoiceItems.createdAt));
      const row = refreshed[0];

      return {
        ...mapInvoiceRow(row),
        notes: row.notes,
        updatedBy: row.updatedBy,
        items: latestItems.map(toItemRecord),
      };
    });
  },

  async getInvoiceDetail(invoiceId: string) {
    return InvoiceRepository.getDetail(invoiceId);
  },

  async listInvoices(query: ListInvoicesQuery): Promise<PaginatedResult<InvoiceSummary>> {
    const { page, limit, offset } = normalizePagination(query.page, query.limit);
    return InvoiceRepository.list({ page, limit, offset, status: query.status, q: query.q });
  },
};
