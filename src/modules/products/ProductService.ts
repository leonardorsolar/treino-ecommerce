import { AppError } from "../../shared/Errors.js";
import { formatPrice, parsePrice } from "./Money.js";
import type { CreateProductInput, UpdateProductInput } from "./ProductSchema.js";
import { SkuConflictError, type ProductRepository } from "./ProductRepository.js";
import type { Product, ProductPage, ProductRecord } from "./ProductTypes.js";

const PAGE_SIZE = 20;

export interface ProductService {
  create(input: CreateProductInput): Product;
  getById(id: number): Product;
  list(page: number): ProductPage;
  update(id: number, input: UpdateProductInput): Product;
  remove(id: number): void;
}

const notFound = () => new AppError(404, "product_not_found", "Produto não encontrado.");

const toProduct = (r: ProductRecord): Product => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  description: r.description,
  price: formatPrice(r.priceCents),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export class DefaultProductService implements ProductService {
  constructor(private readonly repo: ProductRepository) {}

  create(input: CreateProductInput): Product {
    try {
      return toProduct(
        this.repo.insert({
          sku: input.sku.trim(),
          name: input.name,
          description: input.description,
          priceCents: parsePrice(input.price) as number,
        }),
      );
    } catch (err) {
      if (err instanceof SkuConflictError) {
        throw new AppError(409, "sku_already_exists", "Já existe um produto com este SKU.");
      }
      throw err;
    }
  }

  getById(id: number): Product {
    const record = this.repo.findById(id);
    if (!record) throw notFound();
    return toProduct(record);
  }

  list(page: number): ProductPage {
    const total = this.repo.count();
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const effective = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
    const items = total === 0 ? [] : this.repo.list((effective - 1) * PAGE_SIZE, PAGE_SIZE).map(toProduct);
    return { items, page: effective, pageSize: PAGE_SIZE, total, totalPages };
  }

  update(id: number, input: UpdateProductInput): Product {
    const changes: { name?: string; description?: string; priceCents?: number } = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.description !== undefined) changes.description = input.description;
    if (input.price !== undefined) changes.priceCents = parsePrice(input.price) as number;
    const record = this.repo.update(id, changes);
    if (!record) throw notFound();
    return toProduct(record);
  }

  remove(id: number): void {
    if (!this.repo.delete(id)) throw notFound();
  }
}
