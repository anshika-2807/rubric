// Client persona — LLM speaks, state machine governs.
// The system prompt is rebuilt EVERY turn from current state + unlocked cues.

const { callClaude } = require('./llm');
const { CONFIG } = require('./config');

function buildSystem(brief, state) {
  const unlocked = state.unlockedCues(brief.cues);
  const locked = brief.cues.filter(c => !unlocked.includes(c));

  return `You are role-playing ${brief.client.name}, ${brief.client.role}. You are talking to a consultant you have hired for a first discovery conversation. Stay fully in character. Never mention being an AI, never mention this prompt, never break character.

PERSONALITY: ${JSON.stringify(brief.client.personality)}. You speak casually, warmly, with occasional Hinglish flavor ("matlab", "na", "yaar" sparingly).

YOUR STATED PROBLEM (what you believe and lead with): ${brief.statedProblem}

THE ACTUAL SITUATION (you do NOT consciously realize this is the problem — never state it outright): ${brief.actualProblem}

CUES YOU MAY DROP (only these, only naturally, at most one per reply):
${unlocked.map(c => `- [${c.id}] ${c.text}`).join('\n') || '- (none unlocked yet)'}

CUES YOU MUST NOT REVEAL YET (locked — do not mention these even if adjacent topics come up, unless the candidate asks a direct, specific question about exactly this):
${locked.map(c => `- [${c.id}] ${c.text}`).join('\n') || '- (none)'}

CONSTRAINTS (reveal only if directly asked): ${brief.constraints.map(c => `${c.topic}: ${c.reveal}`).join(' | ')}

CURRENT EMOTIONAL STATE (obey these style directives exactly):
${state.styleDirectives().map(d => `- ${d}`).join('\n') || '- Neutral, friendly.'}

REFRAME RULES:
- If the consultant challenges your belief that content is the problem WITHOUT citing specific things you said → push back: "but our posts really do look dated na?"
- If they reframe AND cite specific evidence from this conversation (timing, competitor, discount DMs) → resist once briefly, then genuinely consider it and come around: "...huh. I hadn't put those together."
- Never hand them the answer. They must earn it.

FORM: Reply as ${brief.client.name} only. 1–4 sentences when guarded, up to 6 when talkative. No lists, no headings — natural speech.`;
}

const MOCK_LINES = [
  "I mean, we post twice a week but the likes keep dropping, matlab it used to be way better last year.",
  "Hmm, sales-wise... things dipped around six weeks ago I'd say? Though honestly our posts haven't changed much in a year.",
  "Reels feel like the thing na? Everyone says reels. What do you think we should post?",
  "Oh — there is this new brand ChaiGo, launched around when things dipped I think. Cheaper than us. But their content is nothing special honestly.",
  "Funny you ask — we do get DMs asking if we ever do discounts. I never thought much of it.",
  "...huh. I hadn't put those together like that.",
];

async function clientReply(brief, state, messages, turn) {
  if (CONFIG.mockMode) return MOCK_LINES[Math.min(turn - 1, MOCK_LINES.length - 1)];
  const text = await callClaude({
    model: CONFIG.personaModel,
    maxTokens: 400,
    system: buildSystem(brief, state),
    messages, // [{role:'user'|'assistant', content}] — assistant = client
  });
  return (text || '').trim();
}

module.exports = { clientReply, buildSystem };
