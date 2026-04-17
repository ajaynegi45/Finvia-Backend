import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { invoices } from '../../db/schema/invoices';
import { invoiceItems } from '../../db/schema/invoiceItems';
import type {InvoiceDetail, InvoiceStatus, InvoiceSummary, PaginatedResult} from '../../types/domain';
import { mapInvoiceRow, mapItemRow } from './invoice.mapper';


// --- REPOSITORY ---
export const InvoiceRepository = {

// --- CREATE ---
  async createDraftInvoice(data: {
    customerName: string;
    notes?: string | null;
    subtotalPaise: number;
    taxPaise: number;
    totalPaise: number;
    createdBy: string;
    updatedBy: string;
  }) {
    const [row] = await db
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



// --- FIND BY ID ---
  async findById(invoiceId: string) {
    const [row] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

    return row ?? null;
  },



  // --- LIST ---
  async list(query: {
    page: number;
    limit: number;
    offset: number;
    status?: InvoiceStatus;
    q?: string;
  }): Promise<PaginatedResult<InvoiceSummary>> {
    const conditions = [];

    if (query.status) {
      conditions.push(eq(invoices.status, query.status));
    }

    if (query.q) {
      const search = `%${query.q}%`;
      conditions.push(
        sql`(${ilike(invoices.customerName, search)} OR ${ilike(invoices.invoiceNumber, search)})`
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const baseSelect = db.select().from(invoices);
    const baseCount = db
      .select({ total: sql<number>`count(*)::int` })
      .from(invoices);

    const listQuery = whereClause
      ? baseSelect.where(whereClause)
      : baseSelect;

    const totalQuery = whereClause
      ? baseCount.where(whereClause)
      : baseCount;

    const [rows, totalRows] = await Promise.all([
      listQuery
        .orderBy(desc(invoices.createdAt))
        .limit(query.limit)
        .offset(query.offset),

      totalQuery,
    ]);

    const total = totalRows[0]?.total ?? 0;

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



// --- DETAIL ---
  async getDetail(invoiceId: string): Promise<InvoiceDetail | null> {
    const rows = await db
        .select({
          invoice: invoices,
          item: invoiceItems,
        })
        .from(invoices)
        .leftJoin(
            invoiceItems,
            eq(invoiceItems.invoiceId, invoices.id)
        )
        .where(eq(invoices.id, invoiceId));

    if (rows.length === 0) return null;

    const invoice = rows[0].invoice;

    const items = rows
        .filter((r) => r.item !== null)
        .map((r) => mapItemRow(r.item!));

    return {
      ...mapInvoiceRow(invoice),
      notes: invoice.notes,
      updatedBy: invoice.updatedBy,
      items,
    };
  },

  /* ---------------------------
     UPDATE TOTALS
  ---------------------------- */
  async replaceDraftItems(
      invoiceId: string,
      totals: {
        subtotalPaise: number;
        taxPaise: number;
        totalPaise: number;
      },
      updatedBy: string
  ) {
    await db
        .update(invoices)
        .set({
          subtotalPaise: totals.subtotalPaise,
          taxPaise: totals.taxPaise,
          totalPaise: totals.totalPaise,
          updatedBy,
          updatedAt: sql`NOW()`,
        })
        .where(eq(invoices.id, invoiceId));
  },
};