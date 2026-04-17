import { pgEnum, pgSequence, pgTable, text, integer, timestamp, uuid, index } from 'drizzle-orm/pg-core';

export const invoiceStatusEnum = pgEnum('invoice_status', [
    'DRAFT',
    'FINALIZED',
    'PAID',
    'VOID',
]);

export const invoiceNumberSeq = pgSequence('invoice_number_seq', {
    startWith: 1,
    increment: 1,
    minValue: 1,
    cache: 1,
});

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
        version: integer('version').notNull().default(1),

        createdBy: text('created_by').notNull(),
        updatedBy: text('updated_by'),
        finalizedAt: timestamp('finalized_at', { withTimezone: true }),
        paidAt: timestamp('paid_at', { withTimezone: true }),
        voidedAt: timestamp('voided_at', { withTimezone: true }),

        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('invoices_status_idx').on(table.status),
    ]
);
