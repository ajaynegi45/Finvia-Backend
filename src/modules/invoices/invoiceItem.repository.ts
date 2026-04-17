import { desc, eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { invoiceItems } from '../../db/schema/invoiceItems';

export const InvoiceItemRepository = {
  async insertMany(items: Array<{
    invoiceId: string;
    productId: string;
    productNameSnapshot: string;
    productSkuSnapshot: string;
    unitPricePaiseSnapshot: number;
    quantity: number;
    lineTotalPaise: number;
  }>) {
    if (items.length === 0) return [];
    return db.insert(invoiceItems).values(items).returning();
  },

  async deleteByInvoiceId(invoiceId: string) {
    return db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  },

  async findByInvoiceId(invoiceId: string) {
    return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(desc(invoiceItems.createdAt));
  },
};
