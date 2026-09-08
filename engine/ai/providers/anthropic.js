// Anthropic. The engine's canonical message shape matches this API, so no
// message rewriting is needed.
//
// No native JSON mode — structured tasks rely on the prompt plus extractJson()
// in the router, which is what the classifier and evaluator already expect.

const { providerError } = require('./openai-compatible');

module.exports = {
  name: 'anthropic',

  defaultModels: {
    classify: 'claude-3-5-haiku-latest',
    persona: 'claude-sonnet-4-5',
    evaluate: 'claude-sonnet-4-5',
  },

  async call({ apiKey, model, system, messages, maxTokens, signal }) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
      signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw providerError('anthropic', res.status, detail);
    }

    const data = await res.json();
    return (data.content || []).map(b => b.text || '').join('');
  },
};
