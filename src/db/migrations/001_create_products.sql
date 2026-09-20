CREATE TABLE products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sku         TEXT    NOT NULL COLLATE NOCASE UNIQUE CHECK (length(sku) BETWEEN 1 AND 64),
  name        TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  description TEXT    NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TRIGGER products_sku_immutable BEFORE UPDATE OF sku ON products
BEGIN SELECT RAISE(ABORT, 'sku_immutable'); END;
