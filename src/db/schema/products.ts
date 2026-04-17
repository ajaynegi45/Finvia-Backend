import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const products = pgTable(
    'products',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        name: text('name').notNull(),
        sku: text('sku').notNull().unique(),
        description: text('description'),
        availableQuantity: integer('available_quantity').notNull().default(0),
        unitPricePaise: integer('unit_price_paise').notNull(),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('products_is_active_idx').on(table.isActive),
        index('products_sku_idx').on(table.sku),
    ]
);