import type { Db } from "../../shared/Db.js";
import type { ProductRecord } from "./ProductTypes.js";

export class SkuConflictError extends Error {}

export interface ProductRepository {
  insert(d: { sku: string; name: string; description: string; priceCents: number }): ProductRecord;
  findById(id: number): ProductRecord | undefined;
  list(offset: number, limit: number): ProductRecord[];
  count(): number;
  update(id: number, d: { name?: string; description?: string; priceCents?: number }): ProductRecord | undefined;
  delete(id: number): boolean;
}

interface Row {
  id: number;
  sku: string;
  name: string;
  description: string;
  price_cents: number;
  created_at: string;
  updated_at: string;
}

const COLUMNS = "id, sku, name, description, price_cents, created_at, updated_at";

const toRecord = (r: Row): ProductRecord => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  description: r.description,
  priceCents: r.price_cents,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export class SqliteProductRepository implements ProductRepository {
  constructor(private readonly db: Db) {}

  insert(d: { sku: string; name: string; description: string; priceCents: number }): ProductRecord {
    try {
      const row = this.db
        .prepare(`INSERT INTO products (sku, name, description, price_cents) VALUES (?, ?, ?, ?) RETURNING ${COLUMNS}`)
        .get(d.sku, d.name, d.description, d.priceCents) as Row;
      return toRecord(row);
    } catch (err) {
      if ((err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") throw new SkuConflictError(d.sku);
      throw err;
    }
  }

  findById(id: number): ProductRecord | undefined {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM products WHERE id = ?`).get(id) as Row | undefined;
    return row && toRecord(row);
  }

  list(offset: number, limit: number): ProductRecord[] {
    const rows = this.db
      .prepare(`SELECT ${COLUMNS} FROM products ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as Row[];
    return rows.map(toRecord);
  }

  count(): number {
    return (this.db.prepare("SELECT count(*) AS c FROM products").get() as { c: number }).c;
  }

  update(id: number, d: { name?: string; description?: string; priceCents?: number }): ProductRecord | undefined {
    const sets: string[] = [];
    const values: (string | number)[] = [];
    if (d.name !== undefined) (sets.push("name = ?"), values.push(d.name));
    if (d.description !== undefined) (sets.push("description = ?"), values.push(d.description));
    if (d.priceCents !== undefined) (sets.push("price_cents = ?"), values.push(d.priceCents));
    if (sets.length === 0) return this.findById(id);
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    const row = this.db
      .prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ? RETURNING ${COLUMNS}`)
      .get(...values, id) as Row | undefined;
    return row && toRecord(row);
  }

  delete(id: number): boolean {
    return this.db.prepare("DELETE FROM products WHERE id = ?").run(id).changes > 0;
  }
}
