import { sql } from 'drizzle-orm';
import { db } from '../config/db';

export async function ensureDatabaseBootstrap() {
    await db.execute(sql.raw("CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1"));
}
