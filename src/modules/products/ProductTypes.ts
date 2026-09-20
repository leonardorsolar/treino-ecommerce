export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  price: string; // "19.90" (BRL, 2 casas)
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
}

export interface ProductRecord {
  id: number;
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPage {
  items: Product[];
  page: number;
  pageSize: 20;
  total: number;
  totalPages: number;
}
