// services/catalogMatcher.js
// Takes whatever freeform item name the AI extracted (e.g. "coke") and
// matches it against the REAL product catalog in the database, rather
// than trusting the AI's text directly. This is what turns "transcription
// + AI" into "AI + real data validation."

const Fuse = require('fuse.js');
const Product = require('../models/Product');

// Confidence threshold below which we flag an item as "unverified" so the
// person reviewing the order knows to double check it before confirming.
const MATCH_THRESHOLD = 0.4;

function matchItem(spokenName) {
  const catalog = Product.getAll();

  const fuse = new Fuse(catalog, {
    keys: ['name', 'aliases'],
    includeScore: true,
    threshold: 0.35 // stricter than default — false "matches" are worse than no match
  });

  const results = fuse.search(spokenName);

  if (results.length === 0) {
    return {
      matched: false,
      product: null,
      confidence: 0
    };
  }

  const best = results[0];
  // Fuse's score is 0 = perfect match, 1 = worst match — invert it so
  // higher confidence number = better match, which reads more naturally.
  const confidence = 1 - best.score;

  return {
    matched: confidence >= MATCH_THRESHOLD,
    product: best.item,
    confidence: Math.round(confidence * 100) / 100
  };
}

module.exports = { matchItem, MATCH_THRESHOLD };
