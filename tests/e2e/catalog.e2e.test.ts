import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { json, startServer, tempDb, type RunningServer } from "./server.js";

let server: RunningServer;
let db: ReturnType<typeof tempDb>;
beforeEach(async () => {
  db = tempDb();
  server = await startServer(db.path);
});
afterEach(async () => {
  await server.stop();
  db.cleanup();
});

const product = (over: Record<string, unknown> = {}) => ({
  sku: "TS-001",
  name: "Camiseta",
  description: "Algodão",
  price: "49.9",
  ...over,
});
const get = async (p: string) => {
  const r = await fetch(`${server.url}${p}`);
  return { status: r.status, body: (await r.json()) as any };
};
const post = (body: unknown) => fetch(`${server.url}/products`, json(body));

describe("E2E", () => {
  it("E2E-001 cadastrar, listar e consultar", async () => {
    const created = await (await post(product())).json();
    const list = await get("/products");
    expect(list.body.items[0]).toMatchObject({ sku: "TS-001", price: "49.90" });
    const detail = await get(`/products/${created.id}`);
    expect(detail.body).toMatchObject({ sku: "TS-001", name: "Camiseta", description: "Algodão", price: "49.90" });
  });

  it("E2E-002 editar nome e preço", async () => {
    const created = await (await post(product())).json();
    const res = await fetch(`${server.url}/products/${created.id}`, { ...json({ name: "Novo", price: "10" }), method: "PATCH" });
    expect(res.status).toBe(200);
    const detail = await get(`/products/${created.id}`);
    const list = await get("/products");
    for (const p of [detail.body, list.body.items[0]]) expect(p).toMatchObject({ name: "Novo", price: "10.00", sku: "TS-001" });
  });

  it("E2E-003 excluir e reutilizar o SKU", async () => {
    const created = await (await post(product())).json();
    expect((await fetch(`${server.url}/products/${created.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await get(`/products/${created.id}`)).status).toBe(404);
    expect((await get("/products")).body.items).toEqual([]);
    expect((await post(product())).status).toBe(201);
  });

  it("E2E-004 erro, correção e reenvio", async () => {
    expect((await post(product({ price: "0" }))).status).toBe(400);
    expect((await post(product())).status).toBe(201);
    expect((await post(product())).status).toBe(409);
    expect((await get("/products")).body.total).toBe(1);
  });

  it("E2E-005 persistência após reiniciar o processo", async () => {
    await post(product());
    await server.stop();
    server = await startServer(db.path);
    const list = await get("/products");
    expect(list.body.items.map((p: any) => p.sku)).toEqual(["TS-001"]);
  });

  it("E2E-006 paginação", async () => {
    for (let i = 1; i <= 45; i++) await post(product({ sku: `S-${i}` }));
    expect((await get("/products?page=1")).body.items).toHaveLength(20);
    expect((await get("/products?page=3")).body.items).toHaveLength(5);
    const p9 = await get("/products?page=9");
    expect(p9.body.page).toBe(3);
    expect(p9.body.items).toHaveLength(5);
  });
});
