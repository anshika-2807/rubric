// Google Gemini. Different wire format from OpenAI: system prompt is a separate
// `systemInstruction`, assistant turns are named `model`, and content is parts.

const { providerError } = require('./openai-compatible');

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

module.exports = {
  name: 'gemini',

  defaultModels: {
    classify: 'gemini-2.0-flash-lite',
    persona: 'gemini-2.0-flash',
    evaluate: 'gemini-2.0-flash',
  },

  async call({ apiKey, model, system, messages, maxTokens, json, signal }) {
    const body = {
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: maxTokens },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    if (json) body.generationConfig.responseMimeType = 'application/json';

    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw providerError('gemini', res.status, detail);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    return parts.map(p => p.text || '').join('');
  },
};
