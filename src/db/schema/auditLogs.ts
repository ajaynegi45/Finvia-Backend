import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { invoices } from './invoices';

export const auditActionEnum = pgEnum('audit_action', [
  'INVOICE_CREATED',
  'INVOICE_ITEMS_UPDATED',
  'INVOICE_FINALIZED',
  'INVOICE_PAID',
  'INVOICE_VOIDED',
]);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    action: auditActionEnum('action').notNull(),
    actorId: text('actor_id').notNull(),
    actorRole: text('actor_role').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_invoice_id_idx').on(table.invoiceId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_actor_id_idx').on(table.actorId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ]
);
