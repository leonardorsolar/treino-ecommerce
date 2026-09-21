import type { Request, Response } from "express";
import { AppError } from "../../shared/Errors.js";
import { createProductSchema, parseListQuery, parseProductId, updateProductSchema } from "./ProductSchema.js";
import type { ProductService } from "./ProductService.js";

const notFound = () => new AppError(404, "product_not_found", "Produto não encontrado.");

function idFrom(req: Request): number {
  const id = parseProductId(req.params.id);
  if (id === null) throw notFound();
  return id;
}

export class ProductController {
  constructor(private readonly service: ProductService) {}

  create = (req: Request, res: Response): void => {
    const input = createProductSchema.parse(req.body ?? {});
    res.status(201).json(this.service.create(input));
  };

  list = (req: Request, res: Response): void => {
    res.status(200).json(this.service.list(parseListQuery(req.query)));
  };

  get = (req: Request, res: Response): void => {
    res.status(200).json(this.service.getById(idFrom(req)));
  };

  update = (req: Request, res: Response): void => {
    const id = idFrom(req);
    const input = updateProductSchema.parse(req.body ?? {});
    res.status(200).json(this.service.update(id, input));
  };

  remove = (req: Request, res: Response): void => {
    this.service.remove(idFrom(req));
    res.status(204).end();
  };
}
