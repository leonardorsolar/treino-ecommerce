import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../../src/App.js";
import { runMigrations } from "../../src/db/Migrate.js";
import { SqliteProductRepository } from "../../src/modules/products/ProductRepository.js";
import { openDatabase, type Db } from "../../src/shared/Db.js";

export interface Ctx {
  db: Db;
  api: ReturnType<typeof request>;
  dbPath?: string;
  cleanup(): void;
}

export function setup(opts: { file?: boolean } = {}): Ctx {
  let dir: string | undefined;
  let dbPath: string | undefined;
  if (opts.file) {
    dir = mkdtempSync(path.join(os.tmpdir(), "catalog-it-"));
    dbPath = path.join(dir, "catalog.db");
  }
  const db = openDatabase(dbPath ?? ":memory:");
  runMigrations(db);
  const api = request(createApp({ repository: new SqliteProductRepository(db) }));
  return {
    db,
    api,
    dbPath,
    cleanup() {
      if (db.open) db.close();
      if (dir) rmSync(dir, { recursive: true, force: true });
    },
  };
}

export const base = "/api/v1/products";
export const valid = (over: Record<string, unknown> = {}) => ({
  sku: "TS-001",
  name: "Camiseta",
  description: "Algodão",
  price: "49.90",
  ...over,
});

export async function seed(ctx: Ctx, n: number): Promise<void> {
  const stmt = ctx.db.prepare("INSERT INTO products (sku, name, price_cents) VALUES (?, ?, 100)");
  ctx.db.transaction(() => {
    for (let i = 1; i <= n; i++) stmt.run(`SKU-${i}`, `Produto ${i}`);
  })();
}
