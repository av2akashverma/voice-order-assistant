// services/aiParser.js
// This is the ONLY file that knows about Claude's API. Routes call
// parseOrderText() and get back plain JavaScript items — they never
// see request/response shapes, prompt text, or the API key.

async function parseOrderText(spokenText, existingItems = []) {
  const existingItemsBlock = existingItems.length
    ? `Current draft order (as JSON): ${JSON.stringify(existingItems.map(i => ({
        name: i.name, size: i.size, qty: i.qty
      })))}`
    : 'Current draft order: empty.';

  const prompt = `You are updating a spoken retail order, one utterance at a time.

${existingItemsBlock}

The person just said: "${spokenText}"

Decide whether this is:
(a) a NEW item to add to the order, or
(b) a CORRECTION to an item already in the order (e.g. "actually make that three",
    "change the fanta to large", "remove the chips") — match corrections to the
    most similar existing item by name.

Return ONLY a JSON array representing the COMPLETE updated order after applying
this utterance — not just the new/changed item, the whole order. Nothing else —
no markdown formatting, no explanation.
Each item must look like: {"name": string, "size": string or null, "qty": number}
If no quantity is mentioned for a new item, default qty to 1.
If the utterance removes an item, simply omit it from the returned array.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const rawText = data.content?.find((block) => block.type === 'text')?.text || '[]';
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  const items = JSON.parse(cleaned);

  if (!Array.isArray(items)) {
    throw new Error('AI response was not an array');
  }

  return items;
}

module.exports = { parseOrderText };