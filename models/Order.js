// models/Order.js
// All SQL related to orders and order_items lives here.

const db = require('../db/database');

// Saves a full order (header + line items) in a single transaction —
// either everything saves, or nothing does, so we never end up with a
// half-written order if something fails partway through.
function create(items) {
  const insertOrder = db.prepare('INSERT INTO orders DEFAULT VALUES');
  const insertItem = db.prepare(`
    INSERT INTO order_items
      (order_id, product_id, spoken_name, matched_name, size, qty, match_confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const saveOrder = db.transaction((orderItems) => {
    const { lastInsertRowid: orderId } = insertOrder.run();

    for (const item of orderItems) {
      insertItem.run(
        orderId,
        item.product_id || null,
        item.spoken_name,
        item.matched_name || null,
        item.size || null,
        item.qty || 1,
        item.match_confidence ?? null
      );
    }

    return orderId;
  });

  return saveOrder(items);
}

// Returns past orders, most recent first, with their line items nested in.
function getHistory(limit = 20) {
  const orders = db
    .prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?')
    .all(limit);

  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

  return orders.map((order) => ({
    ...order,
    items: itemsStmt.all(order.id)
  }));
}

module.exports = { create, getHistory };
