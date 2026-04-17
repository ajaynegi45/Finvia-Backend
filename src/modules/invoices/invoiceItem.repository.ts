import { desc, eq } from 'drizzle-orm';
import { invoiceItems } from '../../db/schema/invoiceItems';

export const InvoiceItemRepository = {
  async insertMany(
    client: any,
    items: Array<{
      invoiceId: string;
      productId: string;
      productNameSnapshot: string;
      productSkuSnapshot: string;
      unitPricePaiseSnapshot: number;
      quantity: number;
      lineTotalPaise: number;
    }>
  ) {
    if (items.length === 0) return [];
    return client.insert(invoiceItems).values(items).returning();
  },

  async deleteByInvoiceId(client: any, invoiceId: string) {
    return client.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  },

  async findByInvoiceId(client: any, invoiceId: string) {
    return client
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId))
      .orderBy(desc(invoiceItems.createdAt));
  },
};
