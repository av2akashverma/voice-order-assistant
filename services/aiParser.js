// services/aiParser.js
// This is the ONLY file that knows about Claude's API. Routes call
// parseOrderText() and get back plain JavaScript items — they never
// see request/response shapes, prompt text, or the API key.

async function parseOrderText(spokenText) {
  const prompt = `Extract order items from this spoken retail order text.
Return ONLY a JSON array, nothing else — no markdown formatting, no explanation.
Each item must look like: {"name": string, "size": string or null, "qty": number}
If no quantity is mentioned for an item, default qty to 1.

Spoken text: "${spokenText}"`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
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
