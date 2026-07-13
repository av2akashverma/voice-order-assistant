// db/database.js
// Opens (or creates) the SQLite database file, applies the schema, and
// seeds the product catalog from data/products.json if the table is empty.
// Everything else in the app imports the `db` object from here — this is
// the ONLY file that knows about the database file path or driver.

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'store.db');
const db = new Database(dbPath);

// Apply schema (safe to run every startup — CREATE TABLE IF NOT EXISTS)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Seed products only if the table is currently empty
const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;

if (productCount === 0) {
  const products = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json'), 'utf8')
  );

  const insert = db.prepare('INSERT INTO products (name, size, category, aliases) VALUES (?, ?, ?, ?)');
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.name, item.size, item.category, JSON.stringify(item.aliases || []));
    }
  });

  insertMany(products);
  console.log(`Seeded ${products.length} products into the database.`);
}

module.exports = db;
