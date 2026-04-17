import { auditLogs } from '../../db/schema/auditLogs';

type AuditClient = {
  insert: (table: typeof auditLogs) => {
    values: (value: typeof auditLogs.$inferInsert) => Promise<unknown>;
  };
};

type AuditEntry = {
  invoiceId: string;
  action: typeof auditLogs.$inferInsert.action;
  actorId: string;
  actorRole: string;
  metadata: Record<string, unknown>;
};

export const AuditService = {
  async write(client: AuditClient, entry: AuditEntry) {
    await client.insert(auditLogs).values({
      invoiceId: entry.invoiceId,
      action: entry.action,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      metadata: entry.metadata,
    });
  },
};
