import { Router } from "express";
import type { ProductController } from "./ProductController.js";

export function createProductRouter(controller: ProductController): Router {
  const router = Router();
  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);
  return router;
}
