import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/db/Migrate.js";
import { SkuConflictError, SqliteProductRepository } from "../../src/modules/products/ProductRepository.js";
import { openDatabase, type Db } from "../../src/shared/Db.js";

let db: Db;
let repo: SqliteProductRepository;
beforeEach(() => {
  db = openDatabase(":memory:");
  runMigrations(db);
  repo = new SqliteProductRepository(db);
});
afterEach(() => db.close());

const data = (sku: string) => ({ sku, name: "Nome", description: "", priceCents: 1990 });

describe("ProductRepository", () => {
  it("IT-072 SKU duplicado por caixa lança SkuConflictError", () => {
    repo.insert(data("A-1"));
    expect(() => repo.insert(data("a-1"))).toThrow(SkuConflictError);
  });

  it("IT-073 list ordena por id decrescente e count devolve o total", () => {
    const ids = ["A", "B", "C"].map((s) => repo.insert(data(s)).id);
    expect(repo.list(0, 20).map((p) => p.id)).toEqual([...ids].reverse());
    expect(repo.count()).toBe(3);
  });

  it("IT-075 insert, findById, update e delete", () => {
    const created = repo.insert(data("A-1"));
    expect(repo.findById(created.id)).toEqual(created);
    const updated = repo.update(created.id, { name: "Novo", priceCents: 1050 });
    expect(updated).toMatchObject({ id: created.id, sku: "A-1", name: "Novo", priceCents: 1050 });
    expect(repo.delete(created.id)).toBe(true);
    expect(repo.delete(created.id)).toBe(false);
    expect(repo.update(created.id, { name: "X" })).toBeUndefined();
  });
});
