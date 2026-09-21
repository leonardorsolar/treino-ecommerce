import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/db/Migrate.js";
import { openDatabase, type Db } from "../../src/shared/Db.js";

let db: Db;
afterEach(() => db?.close());

function fresh(): Db {
  db = openDatabase(":memory:");
  runMigrations(db);
  return db;
}

const insert = (d: Db, sku: string, name: string, cents: number) =>
  d.prepare("INSERT INTO products (sku, name, price_cents) VALUES (?, ?, ?)").run(sku, name, cents);

describe("Banco e migrations", () => {
  it("IT-070 migrator cria as tabelas e é idempotente", () => {
    db = openDatabase(":memory:");
    expect(runMigrations(db)).toEqual(["001_create_products.sql"]);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
    expect(tables).toContain("products");
    expect(tables).toContain("schema_migrations");
    expect(runMigrations(db)).toEqual([]);
    expect(db.prepare("SELECT count(*) c FROM schema_migrations").get()).toEqual({ c: 1 });
  });

  it("IT-070 idempotente também em arquivo temporário, com pragmas ativos", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "catalog-"));
    try {
      db = openDatabase(path.join(dir, "nested", "t.db"));
      runMigrations(db);
      db.close();
      db = openDatabase(path.join(dir, "nested", "t.db"));
      expect(runMigrations(db)).toEqual([]);
      expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(db.pragma("busy_timeout", { simple: true })).toBe(5000);
      expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("IT-071 CHECKs rejeitam sku longo, name vazio e price_cents=0", () => {
    fresh();
    expect(() => insert(db, "x".repeat(65), "Nome", 100)).toThrow(/CHECK/);
    expect(() => insert(db, "OK-1", "", 100)).toThrow(/CHECK/);
    expect(() => insert(db, "OK-2", "Nome", 0)).toThrow(/CHECK/);
    expect(() => insert(db, "OK-3", "Nome", 100)).not.toThrow();
  });

  it("IT-074 trigger impede alterar o SKU", () => {
    fresh();
    insert(db, "A-1", "Nome", 100);
    expect(() => db.prepare("UPDATE products SET sku='X'").run()).toThrow(/sku_immutable/);
    expect(() => db.prepare("UPDATE products SET name='Novo'").run()).not.toThrow();
  });

  it("SKU único sem distinção de caixa", () => {
    fresh();
    insert(db, "A-1", "Nome", 100);
    expect(() => insert(db, "a-1", "Outro", 100)).toThrow(/UNIQUE/);
  });
});
