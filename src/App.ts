import express, { type Express } from "express";
import helmet from "helmet";
import { pino, type Logger } from "pino";
import { pinoHttp } from "pino-http";
import { ProductController } from "./modules/products/ProductController.js";
import type { ProductRepository } from "./modules/products/ProductRepository.js";
import { createProductRouter } from "./modules/products/ProductRoutes.js";
import { DefaultProductService } from "./modules/products/ProductService.js";
import { createErrorHandler } from "./shared/ErrorHandler.js";
import { AppError } from "./shared/Errors.js";

export interface AppDeps {
  repository: ProductRepository;
  logger?: Logger;
}

export function createApp(deps: AppDeps): Express {
  const logger = deps.logger ?? pino({ level: "silent" });
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(pinoHttp({ logger }));
  app.use(express.json());

  // Ponto único de extensão para autenticação futura (ADR-005): inserir o middleware aqui.
  const controller = new ProductController(new DefaultProductService(deps.repository));
  app.use("/api/v1/products", createProductRouter(controller));

  app.use((_req, _res, next) => next(new AppError(404, "route_not_found", "Rota não encontrada.")));
  app.use(createErrorHandler());
  return app;
}
