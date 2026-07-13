// models/Product.js
// All SQL related to the products table lives here. Routes and services
// never write raw SQL directly — they call these functions instead.
// This is the "model" layer: it's the only place that knows the products
// table's column names and structure.

const db = require('../db/database');

function getAll() {
  const rows = db.prepare('SELECT * FROM products').all();
  return rows.map((row) => ({
    ...row,
    aliases: row.aliases ? JSON.parse(row.aliases) : []
  }));
}

function getById(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

module.exports = { getAll, getById };
