import { invoices } from '../../db/schema/invoices';
import { invoiceItems } from '../../db/schema/invoiceItems';
import type { InvoiceSummary } from '../../types/domain';


// --- INVOICE MAPPER ---
export function mapInvoiceRow( row: typeof invoices.$inferSelect ): InvoiceSummary {
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



// --- INVOICE ITEM MAPPER ---
export function mapItemRow( row: typeof invoiceItems.$inferSelect ) {
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