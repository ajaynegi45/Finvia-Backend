import { invoices } from '../../db/schema/invoices';
import { invoiceItems } from '../../db/schema/invoiceItems';
import type { InvoiceDetail, InvoiceItemRecord, InvoiceSummary } from '../../types/domain';

export function mapInvoiceRow(row: typeof invoices.$inferSelect): InvoiceSummary {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    customerName: row.customerName,
    subtotalPaise: row.subtotalPaise,
    taxPaise: row.taxPaise,
    totalPaise: row.totalPaise,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapItemRow(row: typeof invoiceItems.$inferSelect): InvoiceItemRecord {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productNameSnapshot,
    productSku: row.productSkuSnapshot,
    unitPricePaise: row.unitPricePaiseSnapshot,
    quantity: row.quantity,
    lineTotalPaise: row.lineTotalPaise,
  };
}

export function mapDetail(row: typeof invoices.$inferSelect, items: InvoiceItemRecord[]): InvoiceDetail {
  return {
    ...mapInvoiceRow(row),
    notes: row.notes,
    updatedBy: row.updatedBy,
    items,
  };
}
