import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { invoices } from './invoices';
import { products } from './products';

export const invoiceItems = pgTable(
    'invoice_items',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        invoiceId: uuid('invoice_id')
            .notNull()
            .references(() => invoices.id, { onDelete: 'cascade' }),

        productId: uuid('product_id')
            .notNull()
            .references(() => products.id),

        productNameSnapshot: text('product_name_snapshot').notNull(),
        productSkuSnapshot: text('product_sku_snapshot').notNull(),
        unitPricePaiseSnapshot: integer('unit_price_paise_snapshot').notNull(),

        quantity: integer('quantity').notNull(),
        lineTotalPaise: integer('line_total_paise').notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('invoice_items_invoice_id_idx').on(table.invoiceId),
        index('invoice_items_product_id_idx').on(table.productId),
    ]
);