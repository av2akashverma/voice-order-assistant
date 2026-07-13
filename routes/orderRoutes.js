// routes/orderRoutes.js
// Routes stay thin on purpose: each one validates input, calls a
// service/model to do the real work, and returns a response. No SQL,
// no AI prompt text, no business logic lives directly in this file.

const express = require('express');
const router = express.Router();

const { parseOrderText } = require('../services/aiParser');
const { matchItem } = require('../services/catalogMatcher');
const Order = require('../models/Order');

// POST /api/parse-order
// Takes spoken text, asks the AI to extract items, then matches each
// item against the real product catalog before sending it to the browser.
router.post('/parse-order', async (req, res) => {
  const spokenText = req.body.text;

  if (!spokenText || typeof spokenText !== 'string' || spokenText.length > 500) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const rawItems = await parseOrderText(spokenText);

    const items = rawItems.map((item) => {
      const match = matchItem(item.name);
      return {
        spoken_name: item.name,
        name: match.matched ? match.product.name : item.name,
        size: item.size || (match.matched ? match.product.size : null),
        qty: item.qty || 1,
        product_id: match.matched ? match.product.id : null,
        confidence: match.confidence,
        verified: match.matched
      };
    });

    res.json({ items });
  } catch (err) {
    console.error('Error parsing order:', err);
    res.status(500).json({ error: 'Server error while parsing order' });
  }
});

// POST /api/submit-order
// Takes the final, reviewed cart and saves it as a real order in the database.
router.post('/submit-order', (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items to submit' });
  }

  try {
    const orderId = Order.create(
      items.map((item) => ({
        product_id: item.product_id || null,
        spoken_name: item.spoken_name || item.name,
        matched_name: item.name,
        size: item.size,
        qty: item.qty,
        match_confidence: item.confidence
      }))
    );

    res.json({ success: true, orderId });
  } catch (err) {
    console.error('Error submitting order:', err);
    res.status(500).json({ error: 'Server error while submitting order' });
  }
});

// GET /api/history
// Returns recent past orders for the history view.
router.get('/history', (req, res) => {
  try {
    const history = Order.getHistory(20);
    res.json({ orders: history });
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Server error while fetching history' });
  }
});

module.exports = router;
