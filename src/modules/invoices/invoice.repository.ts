import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { invoices } from '../../db/schema/invoices';
import { invoiceItems } from '../../db/schema/invoiceItems';
import type { InvoiceDetail, InvoiceStatus, InvoiceSummary, PaginatedResult } from '../../types/domain';
import { mapDetail, mapInvoiceRow, mapItemRow } from './invoice.mapper';

export const InvoiceRepository = {
  async createDraftInvoice(client: any, data: {
    customerName: string;
    notes?: string | null;
    subtotalPaise: number;
    taxPaise: number;
    totalPaise: number;
    createdBy: string;
    updatedBy: string;
  }) {
    const [row] = await client
      .insert(invoices)
      .values({
        customerName: data.customerName,
        notes: data.notes ?? null,
        status: 'DRAFT',
        subtotalPaise: data.subtotalPaise,
        taxPaise: data.taxPaise,
        totalPaise: data.totalPaise,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      })
      .returning();

    return row ?? null;
  },

  async findById(client: any, invoiceId: string) {
    const [row] = await client.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
    return row ?? null;
  },

  async list(
    client: any,
    query: {
      page: number;
      limit: number;
      offset: number;
      status?: InvoiceStatus;
      q?: string;
    }
  ): Promise<PaginatedResult<InvoiceSummary>> {
    const conditions = [] as any[];

    if (query.status) {
      conditions.push(eq(invoices.status, query.status));
    }

    if (query.q) {
      const search = '%' + query.q + '%';
      conditions.push(or(ilike(invoices.customerName, search), ilike(invoices.invoiceNumber, search)));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const listQuery = whereClause ? client.select().from(invoices).where(whereClause) : client.select().from(invoices);
    const totalQuery = whereClause
      ? client.select({ total: sql.raw('count(*)::int') }).from(invoices).where(whereClause)
      : client.select({ total: sql.raw('count(*)::int') }).from(invoices);

    const [rows, totalRows] = await Promise.all([
      listQuery.orderBy(desc(invoices.createdAt)).limit(query.limit).offset(query.offset),
      totalQuery,
    ]);

    const total = Number((totalRows[0] as { total?: number } | undefined)?.total ?? 0);

    return {
      data: rows.map(mapInvoiceRow),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  async getDetail(client: any, invoiceId: string): Promise<InvoiceDetail | null> {
    const rows = await client
      .select({
        invoice: invoices,
        item: invoiceItems,
      })
      .from(invoices)
      .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
      .where(eq(invoices.id, invoiceId));

    if (rows.length === 0) return null;

    const invoice = rows[0].invoice;
    const items = rows.flatMap((row: (typeof rows)[number]) => (row.item ? [mapItemRow(row.item)] : []));

    return mapDetail(invoice, items);
  },

  async nextInvoiceSequence(client: any) {
    const result = await client.execute(sql.raw("SELECT nextval('invoice_number_seq') AS seq"));
    const seqValue = Number((result.rows[0] || {}).seq || 0);

    if (!Number.isFinite(seqValue) || seqValue <= 0) {
      throw new Error('Failed to generate invoice sequence');
    }

    return seqValue;
  },

  async updateDraftTotals(
    client: any,
    params: {
      invoiceId: string;
      expectedVersion: number;
      totals: {
        subtotalPaise: number;
        taxPaise: number;
        totalPaise: number;
      };
      actorId: string;
    }
  ) {
    const [row] = await client
      .update(invoices)
      .set({
        subtotalPaise: params.totals.subtotalPaise,
        taxPaise: params.totals.taxPaise,
        totalPaise: params.totals.totalPaise,
        updatedBy: params.actorId,
        updatedAt: sql.raw('NOW()'),
        version: sql.raw('"version" + 1'),
      })
      .where(and(eq(invoices.id, params.invoiceId), eq(invoices.version, params.expectedVersion), eq(invoices.status, 'DRAFT')))
      .returning();

    return row || null;
  },

  async transitionStatus(
    client: any,
    params: {
      invoiceId: string;
      expectedVersion: number;
      fromStatus: InvoiceStatus;
      toStatus: InvoiceStatus;
      actorId: string;
      invoiceNumber?: string | null;
      finalizedAt?: Date | null;
      paidAt?: Date | null;
      voidedAt?: Date | null;
    }
  ) {
    const [row] = await client
      .update(invoices)
      .set({
        status: params.toStatus,
        invoiceNumber: params.invoiceNumber ?? undefined,
        finalizedAt: params.finalizedAt ?? undefined,
        paidAt: params.paidAt ?? undefined,
        voidedAt: params.voidedAt ?? undefined,
        updatedBy: params.actorId,
        updatedAt: sql.raw('NOW()'),
        version: sql.raw('"version" + 1'),
      })
      .where(and(eq(invoices.id, params.invoiceId), eq(invoices.version, params.expectedVersion), eq(invoices.status, params.fromStatus)))
      .returning();

    return row || null;
  },
};
