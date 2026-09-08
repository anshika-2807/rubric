// Client persona — LLM speaks, state machine governs.
// The system prompt is rebuilt EVERY turn from current state + unlocked cues.

const { callModel } = require('./ai/router');
const { CONFIG } = require('./config');

function buildSystem(brief, state, turn = Infinity) {
  const unlocked = state.unlockedCues(brief.cues, turn);
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

// ── Mock persona ─────────────────────────────────────────────────────────────
// Used when no provider key is configured. It is state-conditioned rather than a
// fixed script, so demo mode exercises the real cue gating: a candidate who
// builds trust and openness gets the buried cues, and one who solution-jumps
// does not. That makes the mechanism visible without an API key, which a fixed
// six-line sequence could never do.

const CUE_LINES = {
  timing: "Hmm, sales-wise... things dipped around six weeks ago I'd say? Though honestly, our posts haven't changed much in over a year.",
  competitor: "Oh — there's this new brand, ChaiGo? Launched around when things dipped, I think. Cheaper than us. Their content is nothing special though, honestly.",
  discount_dms: "Funny you ask — we do keep getting DMs asking if we ever do discounts, or combo packs. I never thought much of it.",
};

const FILLER = {
  guarded: [
    "I mean... it's mostly the posts, na. They look tired.",
    "Not sure what else to tell you. The content just isn't landing.",
  ],
  neutral: [
    "We post twice a week, but the likes keep dropping. Matlab, it used to be way better last year.",
    "Reels feel like the thing, na? Everyone says reels.",
    "We've been at this two years. Two stores plus online.",
  ],
  open: [
    "Honestly it's been stressing me out. I keep redoing the grid and nothing moves.",
    "My cousin said the photos look dated. Maybe she's right? I don't know.",
    "Repeat customers used to just... reorder. That's the part that's gone quiet.",
  ],
  impatient: [
    "Okay, but — what should I actually be posting? That's what I came for.",
    "I'm not sure this is going anywhere. Can we talk about the content?",
  ],
};

const pick = (arr, turn) => arr[turn % arr.length];

function mockReply(brief, state, turn) {
  // Drop a newly available cue if one is unlocked and not yet used. `dropped` is
  // written onto the per-session brief copy, which is why brief.js clones.
  const available = state.unlockedCues(brief.cues, turn).filter(c => !c.dropped);
  if (available.length) {
    const cue = available[0];
    const live = brief.cues.find(c => c.id === cue.id);
    if (live) live.dropped = true;
    return CUE_LINES[cue.id] || cue.text;
  }
  if (state.frustration >= 3) return pick(FILLER.impatient, turn);
  if (state.openness >= 6) return pick(FILLER.open, turn);
  if (state.trust <= 3) return pick(FILLER.guarded, turn);
  return pick(FILLER.neutral, turn);
}

// Said when the provider is unreachable. Deliberately content-free: it must not
// leak a cue, and it must not advance the scenario, because nothing was
// generated. The candidate loses no ground and the state machine is untouched.
const DEGRADED_LINE =
  "Sorry — could you say that again? I lost you for a second there.";

async function clientReply(brief, state, messages, turn, budget) {
  if (CONFIG.mockMode) return mockReply(brief, state, turn);
  try {
    const text = await callModel({
      task: 'persona',
      maxTokens: 400,
      budget,
      system: buildSystem(brief, state, turn),
      messages, // [{role:'user'|'assistant', content}] — assistant = client
    });
    const reply = (text || '').trim();
    return reply || DEGRADED_LINE;
  } catch (e) {
    console.error('[persona] provider unavailable, degrading:', e.message);
    return DEGRADED_LINE;
  }
}

module.exports = { clientReply, buildSystem };
