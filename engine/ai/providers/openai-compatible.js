// Factory for providers speaking the OpenAI chat-completions wire format.
// Groq and OpenAI both do, so they share this adapter.
//
// Canonical internal message shape is Anthropic-like — a separate `system`
// string plus [{role:'user'|'assistant', content}] — so the only work here is
// prepending the system turn.

function makeOpenAICompatibleProvider({ name, baseUrl, defaultModels }) {
  return {
    name,
    defaultModels,

    async call({ apiKey, model, system, messages, maxTokens, json, signal }) {
      const body = {
        model,
        max_tokens: maxTokens,
        messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
      };
      if (json) body.response_format = { type: 'json_object' };

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw providerError(name, res.status, detail);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    },
  };
}

// Carries the HTTP status so the router can distinguish "retry this" (429/5xx)
// from "this will never work" (401/404).
function providerError(provider, status, detail) {
  const err = new Error(`${provider} ${status}: ${String(detail).slice(0, 300)}`);
  err.status = status;
  err.provider = provider;
  return err;
}

module.exports = { makeOpenAICompatibleProvider, providerError };
