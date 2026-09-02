// Minimal Claude API client via fetch (Node >= 18). No SDK dependency.
const { CONFIG } = require('./config');

async function callClaude({ system, messages, model, maxTokens = 1024 }) {
  if (CONFIG.mockMode) return null; // callers provide mock fallbacks
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': CONFIG.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('');
}

// Extract the first JSON object from a model reply (tolerates prose around it).
function extractJson(text) {
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

module.exports = { callClaude, extractJson };
