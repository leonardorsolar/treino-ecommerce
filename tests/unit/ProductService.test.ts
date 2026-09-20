import { describe, expect, it, vi } from "vitest";
import { SkuConflictError, type ProductRepository } from "../../src/modules/products/ProductRepository.js";
import { DefaultProductService } from "../../src/modules/products/ProductService.js";
import type { ProductRecord } from "../../src/modules/products/ProductTypes.js";
import { AppError } from "../../src/shared/Errors.js";

const record = (over: Partial<ProductRecord> = {}): ProductRecord => ({
  id: 1,
  sku: "TS-001",
  name: "Camiseta",
  description: "",
  priceCents: 4990,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

function fakeRepo(over: Partial<ProductRepository> = {}): ProductRepository {
  return {
    insert: vi.fn(() => record()),
    findById: vi.fn(() => record()),
    list: vi.fn(() => []),
    count: vi.fn(() => 0),
    update: vi.fn(() => record()),
    delete: vi.fn(() => true),
    ...over,
  };
}

const appError = (status: number, code: string) => expect.objectContaining({ status, code });
const input = { sku: " TS-001 ", name: "Camiseta", description: "", price: "49.9" };

describe("ProductService", () => {
  it("UT-040 create normaliza SKU, converte preço e devolve Product", () => {
    const repo = fakeRepo();
    const p = new DefaultProductService(repo).create(input);
    expect(repo.insert).toHaveBeenCalledWith({ sku: "TS-001", name: "Camiseta", description: "", priceCents: 4990 });
    expect(p.price).toBe("49.90");
  });

  it("UT-041 conflito de SKU vira 409 sku_already_exists", () => {
    const svc = new DefaultProductService(fakeRepo({ insert: vi.fn(() => { throw new SkuConflictError("x"); }) }));
    expect(() => svc.create(input)).toThrow(appError(409, "sku_already_exists"));
  });

  it("UT-042 duas criações com o mesmo SKU: uma resolve, outra 409", async () => {
    let calls = 0;
    const svc = new DefaultProductService(
      fakeRepo({ insert: vi.fn(() => { if (++calls > 1) throw new SkuConflictError("x"); return record(); }) }),
    );
    const results = await Promise.allSettled([
      Promise.resolve().then(() => svc.create(input)),
      Promise.resolve().then(() => svc.create(input)),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(AppError);
    expect(rejected.reason.status).toBe(409);
  });

  it("UT-043 getById inexistente vira 404", () => {
    const svc = new DefaultProductService(fakeRepo({ findById: vi.fn(() => undefined) }));
    expect(() => svc.getById(9)).toThrow(appError(404, "product_not_found"));
  });

  it("UT-044 list(3) com 45 produtos usa offset 40", () => {
    const repo = fakeRepo({ count: vi.fn(() => 45) });
    const page = new DefaultProductService(repo).list(3);
    expect(repo.list).toHaveBeenCalledWith(40, 20);
    expect(page).toMatchObject({ page: 3, totalPages: 3, pageSize: 20, total: 45 });
  });

  it("UT-045 list(9) com 45 produtos limita à página 3", () => {
    const repo = fakeRepo({ count: vi.fn(() => 45) });
    const page = new DefaultProductService(repo).list(9);
    expect(page.page).toBe(3);
    expect(repo.list).toHaveBeenCalledWith(40, 20);
  });

  it("UT-046 list(1) sem produtos", () => {
    const page = new DefaultProductService(fakeRepo()).list(1);
    expect(page).toEqual({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it("UT-047 update converte preço e devolve o produto atualizado", () => {
    const repo = fakeRepo({ update: vi.fn(() => record({ name: "Novo", priceCents: 1050 })) });
    const p = new DefaultProductService(repo).update(1, { name: "Novo", price: "10.5" });
    expect(repo.update).toHaveBeenCalledWith(1, { name: "Novo", priceCents: 1050 });
    expect(p).toMatchObject({ name: "Novo", price: "10.50" });
  });

  it("UT-048 update de produto inexistente vira 404", () => {
    const svc = new DefaultProductService(fakeRepo({ update: vi.fn(() => undefined) }));
    expect(() => svc.update(1, { name: "Novo" })).toThrow(appError(404, "product_not_found"));
  });

  it("UT-049 update({}) não altera dados e devolve o produto atual", () => {
    const repo = fakeRepo();
    const p = new DefaultProductService(repo).update(1, {});
    expect(repo.update).toHaveBeenCalledWith(1, {});
    expect(p.name).toBe("Camiseta");
  });

  it("UT-050 update repetido devolve o mesmo Product (exceto updatedAt)", () => {
    let current = record();
    const repo = fakeRepo({
      update: vi.fn((_id, d) => (current = { ...current, ...d, updatedAt: String(Math.random()) })),
    });
    const svc = new DefaultProductService(repo);
    const { updatedAt: _a, ...first } = svc.update(1, { name: "Novo" });
    const { updatedAt: _b, ...second } = svc.update(1, { name: "Novo" });
    expect(second).toEqual(first);
  });

  it("UT-051 remove de inexistente vira 404", () => {
    const svc = new DefaultProductService(fakeRepo({ delete: vi.fn(() => false) }));
    expect(() => svc.remove(9)).toThrow(appError(404, "product_not_found"));
  });

  it("UT-052 remove existente resolve sem valor", () => {
    expect(new DefaultProductService(fakeRepo()).remove(1)).toBeUndefined();
  });

  it("UT-053 segundo remove lança 404", () => {
    const del = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    const svc = new DefaultProductService(fakeRepo({ delete: del }));
    svc.remove(1);
    expect(() => svc.remove(1)).toThrow(appError(404, "product_not_found"));
  });
});
