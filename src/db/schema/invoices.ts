import { pgEnum, pgTable, text, integer, timestamp, uuid, index } from 'drizzle-orm/pg-core';

export const invoiceStatusEnum = pgEnum('invoice_status', [
    'DRAFT',
    'FINALIZED',
    'PAID',
    'VOID',
]);

export const invoices = pgTable(
    'invoices',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        invoiceNumber: text('invoice_number').unique(),
        status: invoiceStatusEnum('status').notNull().default('DRAFT'),

        customerName: text('customer_name').notNull(),
        notes: text('notes'),

        subtotalPaise: integer('subtotal_paise').notNull().default(0),
        taxPaise: integer('tax_paise').notNull().default(0),
        totalPaise: integer('total_paise').notNull().default(0),

        createdBy: text('created_by').notNull(),
        updatedBy: text('updated_by'),

        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('invoices_status_idx').on(table.status),
    ]
);