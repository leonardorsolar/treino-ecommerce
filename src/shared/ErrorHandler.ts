import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, type ErrorDetail } from "./Errors.js";

export interface ErrorLogger {
  error(obj: unknown, msg?: string): void;
}

export function toDetails(error: ZodError): ErrorDetail[] {
  return error.issues.flatMap((issue): ErrorDetail[] => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        field: [...issue.path, key].join("."),
        code: "unknown_field",
        message: `Campo desconhecido: ${key}.`,
      }));
    }
    const params = (issue as { params?: { code?: string } }).params;
    return [{ field: issue.path.join("."), code: params?.code ?? issue.code, message: issue.message }];
  });
}

export function createErrorHandler(logger?: ErrorLogger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({
        error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) },
      });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({
        error: { code: "validation_error", message: "Dados inválidos.", details: toDetails(err) },
      });
      return;
    }
    if (err instanceof SyntaxError && (err as { type?: string }).type === "entity.parse.failed") {
      res.status(400).json({ error: { code: "invalid_json", message: "Corpo da requisição não é um JSON válido." } });
      return;
    }
    if ((err as { status?: number }).status === 413) {
      res.status(413).json({ error: { code: "payload_too_large", message: "Corpo da requisição grande demais." } });
      return;
    }
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number" && Number.isInteger(status) && status >= 400 && status < 500) {
      const code = status === 415 ? "unsupported_media_type" : "bad_request";
      res.status(status).json({ error: { code, message: "Requisição inválida." } });
      return;
    }
    (logger ?? (req as { log?: ErrorLogger }).log ?? console).error({ err }, "unhandled error");
    res.status(500).json({ error: { code: "internal_error", message: "Erro interno do servidor." } });
  };
}
