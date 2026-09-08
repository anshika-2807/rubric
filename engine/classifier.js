// Per-turn behavior classifier. AI interprets the candidate's message into
// discrete behaviors; state.js applies deterministic rules to them.
// AI classifies — policy scores. Never the other way around.

const { callModel, extractJson } = require('./ai/router');
const { CONFIG } = require('./config');

const SYSTEM = `You classify one message from a candidate who is interviewing a business client in a consulting discovery conversation. Return STRICT JSON only, no prose:
{
  "accurate_reflection": bool,   // restates/summarizes what the client said, accurately
  "inaccurate_reflection": bool, // restates but distorts or adds claims the client never made
  "open_question": bool,         // at least one genuinely open question (how/why/tell me about)
  "closed_question": bool,       // yes/no or single-fact question(s)
  "rapid_fire": bool,            // 3+ questions machine-gunned in one message
  "solution_jump": bool,         // proposes solutions/deliverables before the problem is established
  "reframe_attempt": bool,       // explicitly challenges or reframes the client's stated problem
  "cited_cues": string[],        // which cue ids the candidate referenced or built upon: subset of CUE_IDS
  "empathy": bool,               // acknowledges the client's feelings/situation genuinely
  "dismissive": bool             // dismisses, talks down to, or steamrolls the client
}`;

function heuristicClassify(text) {
  // Mock-mode fallback: crude but keeps the pipeline runnable without a key.
  const q = (text.match(/\?/g) || []).length;
  const lower = text.toLowerCase();
  return {
    accurate_reflection: /so (what )?(you|you're|your)|sounds like|if i understand/i.test(text),
    inaccurate_reflection: false,
    open_question: /\b(how|why|what|tell me|walk me)\b/i.test(text) && q > 0,
    closed_question: q > 0,
    rapid_fire: q >= 3,
    solution_jump: /\b(you should|i suggest|my recommendation|let's create|we could make|strategy would be)\b/i.test(lower),
    reframe_attempt: /\b(actually|real problem|not (about|the) content|price|pricing)\b/i.test(lower),
    cited_cues: /price|discount|competitor|chaigo|six weeks|6 weeks/.test(lower) ? ['competitor'] : [],
    empathy: /\b(that must|i can imagine|understand(ably)?|tough|makes sense)\b/i.test(lower),
    dismissive: false,
  };
}

async function classifyTurn(candidateMessage, cueIds, recentContext, budget) {
  const mock = heuristicClassify(candidateMessage);
  if (CONFIG.mockMode) return mock;
  try {
    const text = await callModel({
      task: 'classify',        // smallest model: this is the highest-volume call
      maxTokens: 400,
      json: true,
      budget,
      system: SYSTEM.replace('CUE_IDS', JSON.stringify(cueIds)),
      messages: [{
        role: 'user',
        content: `CUE_IDS (things the client has said that the candidate might build on): ${JSON.stringify(cueIds)}\n\nRecent conversation context:\n${recentContext}\n\nCandidate's message to classify:\n"""${candidateMessage}"""\n\nReturn the JSON.`,
      }],
    });
    const parsed = extractJson(text);
    return parsed ? { ...mock, ...parsed } : mock;
  } catch (e) {
    // Degrading to the heuristic here is safe: it keeps the state machine
    // advancing on real (if coarser) behaviour rather than freezing the session.
    console.error('[classifier] falling back to heuristic:', e.message);
    return mock;
  }
}

module.exports = { classifyTurn, heuristicClassify };
