-- schema.sql
-- Three tables: a product catalog, submitted orders, and the items in each order.
-- Splitting orders from order_items (rather than storing items as a JSON blob)
-- is a standard normalization decision: it lets us query "how many times has
-- product X been ordered" directly in SQL, instead of parsing JSON in code.

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  size TEXT,
  category TEXT,
  aliases TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  spoken_name TEXT NOT NULL,
  matched_name TEXT,
  size TEXT,
  qty INTEGER NOT NULL DEFAULT 1,
  match_confidence REAL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
