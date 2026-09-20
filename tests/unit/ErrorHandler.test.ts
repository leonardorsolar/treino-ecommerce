import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { createErrorHandler } from "../../src/shared/ErrorHandler.js";
import { AppError } from "../../src/shared/Errors.js";

function run(err: unknown) {
  const logger = { error: vi.fn() };
  const handler = createErrorHandler(logger);
  const res = {
    statusCode: 0,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  handler(err, {} as any, res as any, vi.fn());
  return { res, logger };
}

describe("ErrorHandler e AppError", () => {
  it("UT-060 AppError responde status e corpo padronizado", () => {
    const { res } = run(new AppError(404, "product_not_found", "Produto não encontrado."));
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: { code: "product_not_found", message: "Produto não encontrado." } });
  });

  it("UT-061 ZodError vira 400 validation_error com details", () => {
    const zerr = new ZodError([
      { code: "custom", path: ["price"], message: "Preço inválido.", params: { code: "price_invalid" } } as any,
    ]);
    const { res } = run(zerr);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("validation_error");
    expect(res.body.error.details).toEqual([{ field: "price", code: "price_invalid", message: "Preço inválido." }]);
  });

  it("UT-062 SyntaxError de JSON malformado vira 400 invalid_json", () => {
    const err = Object.assign(new SyntaxError("Unexpected end"), { type: "entity.parse.failed" });
    const { res } = run(err);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("invalid_json");
  });

  it("UT-075 erro 4xx do body-parser (415) responde 415 sem log de erro interno", () => {
    const { res, logger } = run(Object.assign(new Error("unsupported charset"), { status: 415 }));
    expect(res.statusCode).toBe(415);
    expect(res.body.error.code).toBe("unsupported_media_type");
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("UT-076 erro 4xx genérico (400) responde bad_request", () => {
    const { res } = run(Object.assign(new Error("bad gzip"), { status: 400 }));
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("bad_request");
  });

  it("UT-063 erro desconhecido vira 500 sem vazar stack e é logado", () => {
    const err = new Error("boom");
    const { res, logger } = run(err);
    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe("internal_error");
    expect(JSON.stringify(res.body)).not.toMatch(/stack|boom/);
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
