import { describe, expect, it } from "vitest";
import {
  createProductSchema,
  parseListQuery,
  parseProductId,
  updateProductSchema,
} from "../../src/modules/products/ProductSchema.js";
import { toDetails } from "../../src/shared/ErrorHandler.js";

const valid = { sku: "TS-001", name: "Camiseta", description: "Algodão", price: "49.90" };

function details(schema: { safeParse(v: unknown): any }, input: unknown) {
  const r = schema.safeParse(input);
  expect(r.success).toBe(false);
  return toDetails(r.error).map(({ field, code }) => ({ field, code }));
}

describe("createProductSchema", () => {
  it("UT-001 aceita entrada válida", () => expect(createProductSchema.parse(valid)).toEqual(valid));
  it("UT-002 description ausente vira ''", () => {
    const { description: _d, ...rest } = valid;
    expect(createProductSchema.parse(rest).description).toBe("");
  });
  it("UT-003 sku sofre trim e preserva a caixa", () =>
    expect(createProductSchema.parse({ ...valid, sku: "  ts-001  " }).sku).toBe("ts-001"));
  it("UT-004 sku vazio", () =>
    expect(details(createProductSchema, { ...valid, sku: "" })).toContainEqual({ field: "sku", code: "sku_required" }));
  it("UT-005 sku só espaços", () =>
    expect(details(createProductSchema, { ...valid, sku: "   " })).toContainEqual({ field: "sku", code: "sku_required" }));
  it("UT-006 name só espaços", () =>
    expect(details(createProductSchema, { ...valid, name: "   " })).toContainEqual({ field: "name", code: "name_required" }));
  it.each([
    ["UT-007", "0"],
    ["UT-008", "-1"],
    ["UT-009", "abc"],
    ["UT-010", 19.9],
    ["UT-011", "19.999"],
  ])("%s price %j é inválido", (_id, price) =>
    expect(details(createProductSchema, { ...valid, price })).toContainEqual({ field: "price", code: "price_invalid" }));
  it("UT-012 sku com 64 caracteres é aceito", () =>
    expect(createProductSchema.parse({ ...valid, sku: "a".repeat(64) }).sku).toHaveLength(64));
  it("UT-013 sku com 65 caracteres falha", () =>
    expect(details(createProductSchema, { ...valid, sku: "a".repeat(65) })).toContainEqual({ field: "sku", code: "sku_too_long" }));
  it("UT-014 name com 200 caracteres é aceito", () =>
    expect(createProductSchema.parse({ ...valid, name: "a".repeat(200) }).name).toHaveLength(200));
  it("UT-015 name com 201 caracteres falha", () =>
    expect(details(createProductSchema, { ...valid, name: "a".repeat(201) })).toContainEqual({ field: "name", code: "name_too_long" }));
  it("UT-016 description com 5000 caracteres é aceita", () =>
    expect(createProductSchema.parse({ ...valid, description: "a".repeat(5000) }).description).toHaveLength(5000));
  it("UT-017 description com 5001 caracteres falha", () =>
    expect(details(createProductSchema, { ...valid, description: "a".repeat(5001) })).toContainEqual({
      field: "description",
      code: "description_too_long",
    }));
  it("UT-018 texto hostil é preservado sem escape", () =>
    expect(createProductSchema.parse({ ...valid, name: "<script>alert(1)</script>" }).name).toBe("<script>alert(1)</script>"));
});

describe("updateProductSchema", () => {
  it("UT-019 {} é aceito", () => expect(updateProductSchema.parse({})).toEqual({}));
  it("UT-020 sku é imutável", () =>
    expect(details(updateProductSchema, { sku: "X" })).toContainEqual({ field: "sku", code: "sku_immutable" }));
  it("UT-021 campo desconhecido é rejeitado", () =>
    expect(details(updateProductSchema, { stock: 5 })).toEqual([{ field: "stock", code: "unknown_field" }]));
  it("UT-022 name vazio", () =>
    expect(details(updateProductSchema, { name: "" })).toContainEqual({ field: "name", code: "name_required" }));
  it("UT-023 price zero", () =>
    expect(details(updateProductSchema, { price: "0" })).toContainEqual({ field: "price", code: "price_invalid" }));
});

describe("parseListQuery", () => {
  it("UT-024 '3' → 3", () => expect(parseListQuery({ page: "3" })).toBe(3));
  it("UT-025 '0' → 1", () => expect(parseListQuery({ page: "0" })).toBe(1));
  it("UT-026 '-2' → 1", () => expect(parseListQuery({ page: "-2" })).toBe(1));
  it("UT-027 'abc' → 1", () => expect(parseListQuery({ page: "abc" })).toBe(1));
  it("UT-028 ausente → 1", () => expect(parseListQuery({})).toBe(1));
});

describe("parseProductId", () => {
  it("UT-029 '12' → 12", () => expect(parseProductId("12")).toBe(12));
  it("UT-030 inválidos → null", () => {
    for (const v of ["abc", "1.5", "0", "-3"]) expect(parseProductId(v)).toBeNull();
  });
});
