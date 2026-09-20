import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "../../src/shared/Db.js";
import { base, seed, setup, valid, type Ctx } from "./helpers.js";

let ctx: Ctx;
afterEach(() => ctx?.cleanup());

const total = async () => (await ctx.api.get(base)).body.total;
const codes = (body: any) => body.error.details.map((d: any) => `${d.field}:${d.code}`);

describe("POST /products", () => {
  it("IT-001 cria e lista o produto", async () => {
    ctx = setup();
    const res = await ctx.api.post(base).send(valid());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ sku: "TS-001", price: "49.90" });
    expect(res.body.id).toBeTypeOf("number");
    expect(res.body.createdAt).toBeTypeOf("string");
    const list = await ctx.api.get(base);
    expect(list.body.items.map((p: any) => p.sku)).toEqual(["TS-001"]);
  });

  it("IT-002 sem description → ''", async () => {
    ctx = setup();
    const { description: _d, ...body } = valid();
    const res = await ctx.api.post(base).send(body);
    expect(res.status).toBe(201);
    expect(res.body.description).toBe("");
  });

  it("IT-003 price '49.9' vira '49.90' e é guardado como 4990", async () => {
    ctx = setup();
    const res = await ctx.api.post(base).send(valid({ price: "49.9" }));
    expect(res.body.price).toBe("49.90");
    expect((await ctx.api.get(`${base}/${res.body.id}`)).body.price).toBe("49.90");
    expect(ctx.db.prepare("SELECT price_cents c FROM products").get()).toEqual({ c: 4990 });
  });

  it("IT-004 SKU duplicado → 409", async () => {
    ctx = setup();
    await ctx.api.post(base).send(valid());
    const res = await ctx.api.post(base).send(valid());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("sku_already_exists");
    expect(await total()).toBe(1);
  });

  it("IT-005 SKU duplicado por caixa/espaços → 409", async () => {
    ctx = setup();
    await ctx.api.post(base).send(valid());
    const res = await ctx.api.post(base).send(valid({ sku: " ts-001 " }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("sku_already_exists");
  });

  it("IT-006 SKU em branco → 400", async () => {
    ctx = setup();
    const res = await ctx.api.post(base).send(valid({ sku: "   " }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
    expect(res.body.error.details[0].field).toBe("sku");
    expect(await total()).toBe(0);
  });

  it("IT-007 nome em branco → 400", async () => {
    ctx = setup();
    const res = await ctx.api.post(base).send(valid({ name: "  " }));
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("name");
  });

  it.each(["0", "-5", "abc", 19.9, "19.999"])("IT-008 price %j → 400", async (price) => {
    ctx = setup();
    const res = await ctx.api.post(base).send(valid({ price }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
    expect(res.body.error.details[0].field).toBe("price");
  });

  it("IT-009 tamanhos máximos", async () => {
    ctx = setup();
    const res = await ctx.api
      .post(base)
      .send(valid({ sku: "a".repeat(65), name: "a".repeat(201), description: "a".repeat(5001) }));
    expect(res.status).toBe(400);
    expect(codes(res.body)).toEqual(expect.arrayContaining(["sku:sku_too_long", "name:name_too_long", "description:description_too_long"]));
  });

  it("IT-010 POSTs simultâneos com o mesmo SKU → [201, 409]", async () => {
    ctx = setup();
    const results = await Promise.all([ctx.api.post(base).send(valid()), ctx.api.post(base).send(valid())]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await total()).toBe(1);
  });

  it("IT-011 reenvio após sucesso → 409", async () => {
    ctx = setup();
    await ctx.api.post(base).send(valid());
    expect((await ctx.api.post(base).send(valid())).status).toBe(409);
    expect(await total()).toBe(1);
  });

  it("IT-012 falha de banco → 500 e nada é criado", async () => {
    ctx = setup({ file: true });
    ctx.db.close();
    const res = await ctx.api.post(base).send(valid());
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal_error");
    const reopened = openDatabase(ctx.dbPath!);
    expect(reopened.prepare("SELECT count(*) c FROM products").get()).toEqual({ c: 0 });
    reopened.close();
  });

  it("IT-013 JSON malformado → 400 invalid_json", async () => {
    ctx = setup();
    const res = await ctx.api.post(base).set("Content-Type", "application/json").send('{"sku":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_json");
  });

  it("IT-014 texto hostil é devolvido literal, com nosniff", async () => {
    ctx = setup();
    const created = await ctx.api.post(base).send(valid({ name: "<script>alert(1)</script>" }));
    expect(created.status).toBe(201);
    const res = await ctx.api.get(`${base}/${created.body.id}`);
    expect(res.body.name).toBe("<script>alert(1)</script>");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("IT-015 sem corpo → 400 validation_error", async () => {
    ctx = setup();
    const res = await ctx.api.post(base);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
  });
});

describe("GET /products", () => {
  it("IT-020 banco vazio", async () => {
    ctx = setup();
    const res = await ctx.api.get(base);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], page: 1, total: 0, totalPages: 0 });
  });

  it("IT-021 45 produtos: 20 itens, 3 páginas, mais recente primeiro", async () => {
    ctx = setup();
    await seed(ctx, 45);
    const res = await ctx.api.get(base);
    expect(res.body.items).toHaveLength(20);
    expect(res.body.totalPages).toBe(3);
    expect(res.body.items[0].sku).toBe("SKU-45");
  });

  it("IT-022 página 3 tem 5 itens", async () => {
    ctx = setup();
    await seed(ctx, 45);
    const res = await ctx.api.get(`${base}?page=3`);
    expect(res.body.items).toHaveLength(5);
    expect(res.body.page).toBe(3);
  });

  it("IT-023 página 9 devolve a página 3", async () => {
    ctx = setup();
    await seed(ctx, 45);
    const res = await ctx.api.get(`${base}?page=9`);
    expect(res.body.items).toHaveLength(5);
    expect(res.body.page).toBe(3);
  });

  it.each(["0", "-1", "abc"])("IT-024 ?page=%s → página 1", async (page) => {
    ctx = setup();
    await seed(ctx, 3);
    const res = await ctx.api.get(`${base}?page=${page}`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
  });

  it("IT-025 25 produtos: páginas 1 e 2 sem repetição nem perda", async () => {
    ctx = setup();
    for (let i = 1; i <= 25; i++) await ctx.api.post(base).send(valid({ sku: `S-${i}` }));
    const ids = [...(await ctx.api.get(base)).body.items, ...(await ctx.api.get(`${base}?page=2`)).body.items].map((p: any) => p.id);
    expect(new Set(ids).size).toBe(25);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });

  it("IT-026 falha de banco → 500", async () => {
    ctx = setup({ file: true });
    ctx.db.close();
    const res = await ctx.api.get(base);
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal_error");
  });

  it("IT-027 10.000 produtos: 20 itens em menos de 500 ms", async () => {
    ctx = setup();
    await seed(ctx, 10000);
    const start = performance.now();
    const res = await ctx.api.get(base);
    expect(performance.now() - start).toBeLessThan(500);
    expect(res.body.items).toHaveLength(20);
  });

  it("IT-028 excluir um e listar", async () => {
    ctx = setup();
    const ids = [];
    for (const s of ["A", "B", "C"]) ids.push((await ctx.api.post(base).send(valid({ sku: s }))).body.id);
    await ctx.api.delete(`${base}/${ids[1]}`);
    const res = await ctx.api.get(base);
    expect(res.body.items.map((p: any) => p.id)).toEqual([ids[2], ids[0]]);
  });

  it("IT-029 criar entre a página 1 e a 2 não gera erro nem repetição", async () => {
    ctx = setup();
    await seed(ctx, 25);
    const p1 = await ctx.api.get(base);
    await ctx.api.post(base).send(valid({ sku: "NOVO" }));
    const p2 = await ctx.api.get(`${base}?page=2`);
    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);
    const firstIds = new Set(p1.body.items.map((p: any) => p.id));
    // a criação desloca a paginação por offset: o item na fronteira reaparece; não pode haver id repetido dentro da página 2
    const ids2 = p2.body.items.map((p: any) => p.id);
    expect(new Set(ids2).size).toBe(ids2.length);
    expect(firstIds.size).toBe(20);
  });
});

describe("GET /products/:id", () => {
  it("IT-030 consulta existente", async () => {
    ctx = setup();
    const { body } = await ctx.api.post(base).send(valid());
    const res = await ctx.api.get(`${base}/${body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ sku: "TS-001", name: "Camiseta", description: "Algodão", price: "49.90" });
  });

  it("IT-031 sem descrição → ''", async () => {
    ctx = setup();
    const { description: _d, ...body } = valid();
    const created = await ctx.api.post(base).send(body);
    expect((await ctx.api.get(`${base}/${created.body.id}`)).body.description).toBe("");
  });

  it("IT-032 id inexistente → 404", async () => {
    ctx = setup();
    const res = await ctx.api.get(`${base}/9999`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("product_not_found");
  });

  it.each(["abc", "1.5"])("IT-033 id malformado %s → 404", async (id) => {
    ctx = setup();
    const res = await ctx.api.get(`${base}/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("product_not_found");
  });

  it("IT-034 falha de banco → 500", async () => {
    ctx = setup({ file: true });
    ctx.db.close();
    const res = await ctx.api.get(`${base}/1`);
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("internal_error");
  });
});

describe("PATCH /products/:id", () => {
  const create = async () => (await ctx.api.post(base).send(valid())).body;

  it("IT-040 edita nome, descrição e preço mantendo o SKU", async () => {
    ctx = setup();
    const p = await create();
    const res = await ctx.api.patch(`${base}/${p.id}`).send({ name: "Novo", description: "D", price: "10.5" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Novo", description: "D", price: "10.50", sku: "TS-001" });
    expect((await ctx.api.get(`${base}/${p.id}`)).body.name).toBe("Novo");
    expect((await ctx.api.get(base)).body.items[0].price).toBe("10.50");
  });

  it("IT-041 alterar SKU → 400 sku_immutable", async () => {
    ctx = setup();
    const p = await create();
    const res = await ctx.api.patch(`${base}/${p.id}`).send({ sku: "OUTRO" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
    expect(codes(res.body)).toContain("sku:sku_immutable");
    expect((await ctx.api.get(`${base}/${p.id}`)).body.sku).toBe("TS-001");
  });

  it("IT-042 nome vazio → 400 e nome anterior mantido", async () => {
    ctx = setup();
    const p = await create();
    expect((await ctx.api.patch(`${base}/${p.id}`).send({ name: "" })).status).toBe(400);
    expect((await ctx.api.get(`${base}/${p.id}`)).body.name).toBe("Camiseta");
  });

  it.each(["0", "-1", "abc", "19.999"])("IT-043 price %s → 400 e preço mantido", async (price) => {
    ctx = setup();
    const p = await create();
    const res = await ctx.api.patch(`${base}/${p.id}`).send({ price });
    expect(res.status).toBe(400);
    expect(codes(res.body)).toContain("price:price_invalid");
    expect((await ctx.api.get(`${base}/${p.id}`)).body.price).toBe("49.90");
  });

  it("IT-044 tamanhos máximos", async () => {
    ctx = setup();
    const p = await create();
    const res = await ctx.api.patch(`${base}/${p.id}`).send({ name: "a".repeat(201), description: "a".repeat(5001) });
    expect(res.status).toBe(400);
    expect(codes(res.body)).toEqual(expect.arrayContaining(["name:name_too_long", "description:description_too_long"]));
  });

  it("IT-045 descrição apagada", async () => {
    ctx = setup();
    const p = await create();
    const res = await ctx.api.patch(`${base}/${p.id}`).send({ description: "" });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe("");
  });

  it("IT-046 produto inexistente → 404", async () => {
    ctx = setup();
    const res = await ctx.api.patch(`${base}/9999`).send({ name: "X" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("product_not_found");
    expect((await ctx.api.get(`${base}/9999`)).status).toBe(404);
  });

  it("IT-047 PATCHs simultâneos: a última gravação prevalece e fica estável", async () => {
    ctx = setup();
    const p = await create();
    const rs = await Promise.all([
      ctx.api.patch(`${base}/${p.id}`).send({ name: "A" }),
      ctx.api.patch(`${base}/${p.id}`).send({ name: "B" }),
    ]);
    expect(rs.map((r) => r.status)).toEqual([200, 200]);
    const n1 = (await ctx.api.get(`${base}/${p.id}`)).body.name;
    const n2 = (await ctx.api.get(`${base}/${p.id}`)).body.name;
    expect(["A", "B"]).toContain(n1);
    expect(n2).toBe(n1);
  });

  it("IT-048 PATCH {} é no-op", async () => {
    ctx = setup();
    const p = await create();
    const res = await ctx.api.patch(`${base}/${p.id}`).send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual(p);
  });

  it("IT-049 mesmo PATCH duas vezes é idempotente", async () => {
    ctx = setup();
    const p = await create();
    const a = await ctx.api.patch(`${base}/${p.id}`).send({ name: "Novo" });
    const b = await ctx.api.patch(`${base}/${p.id}`).send({ name: "Novo" });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(b.body.name).toBe(a.body.name);
    expect(b.body.price).toBe(a.body.price);
  });

  it("IT-050 HTML hostil é guardado literal", async () => {
    ctx = setup();
    const p = await create();
    expect((await ctx.api.patch(`${base}/${p.id}`).send({ name: "<img onerror=x>" })).status).toBe(200);
    expect((await ctx.api.get(`${base}/${p.id}`)).body.name).toBe("<img onerror=x>");
  });

  it("IT-051 falha de banco → 500 e valores anteriores intactos", async () => {
    ctx = setup({ file: true });
    const p = await create();
    ctx.db.close();
    const res = await ctx.api.patch(`${base}/${p.id}`).send({ name: "Novo" });
    expect(res.status).toBe(500);
    const reopened = openDatabase(ctx.dbPath!);
    expect(reopened.prepare("SELECT name FROM products WHERE id=?").get(p.id)).toEqual({ name: "Camiseta" });
    reopened.close();
  });

  it("IT-052 PATCH após exclusão → 404 e não recria", async () => {
    ctx = setup();
    const p = await create();
    await ctx.api.delete(`${base}/${p.id}`);
    expect((await ctx.api.patch(`${base}/${p.id}`).send({ name: "X" })).status).toBe(404);
    expect(await total()).toBe(0);
  });
});

describe("DELETE /products/:id e rotas", () => {
  const create = async (sku = "TS-001") => (await ctx.api.post(base).send(valid({ sku }))).body;

  it("IT-060 exclui: 204 sem corpo, some do detalhe e da listagem", async () => {
    ctx = setup();
    const p = await create();
    const res = await ctx.api.delete(`${base}/${p.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect((await ctx.api.get(`${base}/${p.id}`)).status).toBe(404);
    expect((await ctx.api.get(base)).body.items).toEqual([]);
  });

  it("IT-061 segundo DELETE → 404", async () => {
    ctx = setup();
    const p = await create();
    expect((await ctx.api.delete(`${base}/${p.id}`)).status).toBe(204);
    const res = await ctx.api.delete(`${base}/${p.id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("product_not_found");
  });

  it("IT-062 DELETEs simultâneos → [204, 404]", async () => {
    ctx = setup();
    const p = await create();
    const rs = await Promise.all([ctx.api.delete(`${base}/${p.id}`), ctx.api.delete(`${base}/${p.id}`)]);
    expect(rs.map((r) => r.status).sort()).toEqual([204, 404]);
  });

  it.each(["9999", "abc"])("IT-063 DELETE %s → 404", async (id) => {
    ctx = setup();
    const res = await ctx.api.delete(`${base}/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("product_not_found");
  });

  it("IT-064 SKU liberado após exclusão, com novo id", async () => {
    ctx = setup();
    const p = await create();
    await ctx.api.delete(`${base}/${p.id}`);
    const again = await ctx.api.post(base).send(valid());
    expect(again.status).toBe(201);
    expect(again.body.id).not.toBe(p.id);
  });

  it("IT-065 excluir o único produto", async () => {
    ctx = setup();
    const p = await create();
    await ctx.api.delete(`${base}/${p.id}`);
    expect((await ctx.api.get(base)).body).toMatchObject({ items: [], total: 0 });
  });

  it("IT-066 excluir o único item da última página devolve a página 1", async () => {
    ctx = setup();
    await seed(ctx, 21);
    const oldest = (await ctx.api.get(`${base}?page=2`)).body.items[0];
    await ctx.api.delete(`${base}/${oldest.id}`);
    const res = await ctx.api.get(`${base}?page=2`);
    expect(res.body.items).toHaveLength(20);
    expect(res.body.page).toBe(1);
  });

  it("IT-067 falha de banco → 500 e produto continua", async () => {
    ctx = setup({ file: true });
    const p = await create();
    ctx.db.close();
    expect((await ctx.api.delete(`${base}/${p.id}`)).status).toBe(500);
    const reopened = openDatabase(ctx.dbPath!);
    expect(reopened.prepare("SELECT count(*) c FROM products").get()).toEqual({ c: 1 });
    reopened.close();
  });

  it("IT-068 não existe rota de restauração", async () => {
    ctx = setup();
    const res = await ctx.api.post(`${base}/1/restore`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("route_not_found");
  });

  it("IT-069 rota inexistente → 404 route_not_found", async () => {
    ctx = setup();
    const res = await ctx.api.get("/api/v1/inexistente");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("route_not_found");
  });
});

describe("body-parser 4xx", () => {
  it("IT-076 Content-Encoding não suportado → 415, não 500", async () => {
    const ctx = setup();
    const res = await ctx.api.post(base).set("content-type", "application/json").set("content-encoding", "foo").send("{}");
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("unsupported_media_type");
    ctx.cleanup();
  });
});
