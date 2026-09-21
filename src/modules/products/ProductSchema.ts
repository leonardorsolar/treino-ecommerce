import { z } from "zod";
import { parsePrice } from "./Money.js";

const issue = (ctx: z.RefinementCtx, code: string, message: string) =>
  ctx.addIssue({ code: "custom", message, params: { code } });

const length = (s: string) => [...s].length;
const PRINTABLE_ASCII = /^[\x20-\x7E]+$/;

function text(field: string, label: string, max: number, required: boolean, asciiOnly = false) {
  return z.unknown().transform((value, ctx) => {
    if (typeof value !== "string") {
      issue(ctx, `${field}_required`, `${label} é obrigatório.`);
      return z.NEVER;
    }
    const trimmed = value.trim();
    if (required && trimmed.length === 0) {
      issue(ctx, `${field}_required`, `${label} é obrigatório.`);
      return z.NEVER;
    }
    if (length(trimmed) > max) {
      issue(ctx, `${field}_too_long`, `${label} deve ter no máximo ${max} caracteres.`);
      return z.NEVER;
    }
    if (asciiOnly && !PRINTABLE_ASCII.test(trimmed)) {
      issue(ctx, `${field}_invalid`, `${label} deve conter apenas caracteres ASCII imprimíveis.`);
      return z.NEVER;
    }
    return trimmed;
  });
}

const descriptionField = z.unknown().transform((value, ctx) => {
  if (typeof value !== "string") {
    issue(ctx, "description_invalid", "Descrição deve ser um texto.");
    return z.NEVER;
  }
  const trimmed = value.trim();
  if (length(trimmed) > 5000) {
    issue(ctx, "description_too_long", "Descrição deve ter no máximo 5000 caracteres.");
    return z.NEVER;
  }
  return trimmed;
});

const priceField = z.unknown().transform((value, ctx) => {
  if (parsePrice(value) === null) {
    issue(ctx, "price_invalid", "Preço inválido: use um valor maior que zero com até 2 casas decimais.");
    return z.NEVER;
  }
  return value as string;
});

export const createProductSchema = z
  .object({
    sku: text("sku", "SKU", 64, true, true),
    name: text("name", "Nome", 200, true),
    description: descriptionField.default(""),
    price: priceField,
  })
  .strict();

export const updateProductSchema = z
  .object({
    sku: z
      .any()
      .superRefine((value, ctx) => {
        if (value !== undefined) issue(ctx, "sku_immutable", "O SKU não pode ser alterado.");
      })
      .optional(),
    name: text("name", "Nome", 200, true).optional(),
    description: descriptionField.optional(),
    price: priceField.optional(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export function parseListQuery(query: { page?: unknown }): number {
  const raw = query.page;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function parseProductId(raw: unknown): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id >= 1 ? id : null;
}
