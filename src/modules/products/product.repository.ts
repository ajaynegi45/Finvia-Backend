import { and, desc, eq, ilike } from 'drizzle-orm';
import { db } from '../../config/db';
import { products } from '../../db/schema/products';
import type { ProductListItem, ProductRecord } from '../../types/domain';

function mapRow(row: typeof products.$inferSelect): ProductRecord {
  return row;
}

function toListItem(row: typeof products.$inferSelect): ProductListItem {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    availableQuantity: row.availableQuantity,
    unitPricePaise: row.unitPricePaise,
    isActive: row.isActive,
  };
}

export const ProductRepository = {
  async findAvailable(filter?: { q?: string; activeOnly?: boolean }) {
    const conditions = [] as any[];

    if (filter?.activeOnly !== false) {
      conditions.push(eq(products.isActive, true));
    }

    if (filter?.q) {
      const search = `%${filter.q}%`;
      conditions.push(ilike(products.name, search));
    }

    const rows = await db
      .select()
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt));

    return rows.map(toListItem);
  },

  async findByIds(ids: string[]) {
    if (ids.length === 0) return [] as ProductRecord[];
    const rows = await db.select().from(products);
    return rows.filter((row) => ids.includes(row.id)).map(mapRow);
  },

  async findById(id: string) {
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async create(data: typeof products.$inferInsert) {
    const [row] = await db.insert(products).values(data).returning();
    return mapRow(row);
  },

  async bulkCreate(data: (typeof products.$inferInsert)[]) {
    const rows = await db.insert(products).values(data).returning();
    return rows.map(mapRow);
  },
};
