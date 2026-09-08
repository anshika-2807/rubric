// L2 hidden-brief instance — Problem Framing, "stated ≠ actual".
// TEMPLATE STRUCTURE is what gets standardized per level; instances are
// generated fresh per candidate in production. This is one hand-authored
// instance for the prototype.
//
// PRIVATE: never expose actualProblem or cues to the candidate UI.

/**
 * A fresh copy of the instance for one session.
 *
 * Sessions previously shared one module-level object by reference. Nothing
 * mutated it, so it was harmless — but the moment instances are generated or
 * annotated per candidate that becomes a cross-session leak, which in an
 * assessment product means one candidate's state affecting another's scenario.
 * Copying at the boundary costs nothing and closes that off now.
 */
function instanceForSession() {
  return structuredClone(L2_INSTANCE);
}

const L2_INSTANCE = {
  id: 'PF-L2-KAHVA-001',
  level: 'L2',
  competencyFocus: ['problem_framing', 'active_listening', 'questioning'],
  client: {
    name: 'Meera',
    role: 'Founder, Kahva — a small D2C masala chai brand (online orders + two local stores)',
    personality: { warmth: 'friendly', verbosity: 'rambling', evasiveness: 'low' },
  },
  statedProblem:
    "Our Instagram isn't working anymore. I think our posts look outdated — I want better content, maybe reels, so sales pick up again.",
  actualProblem:
    'Price competitiveness: a cheaper competitor (ChaiGo) launched ~6 weeks ago; content is fine and unchanged for a year. Customers are price-shopping.',
  // Cue-unlock thresholds are calibrated against the state machine's step sizes
  // (state.js moves trust/openness by 0.5–1 per qualifying behaviour, from a
  // start of trust 5 / openness 4).
  //
  // Calibration note: these were originally openness ≥5 and trust ≥6, which a
  // single accurate reflection cleared — it pushed trust to 6 and openness to
  // 5, so all three cues unlocked on turn 1 and the gating did nothing. The
  // decisive cues now need roughly three turns of sustained good behaviour, and
  // minTurn stops even perfect play from emptying the brief immediately. A
  // client does not volunteer her most useful observation ninety seconds in.
  cues: [
    {
      id: 'timing',
      text: 'Sales dipped about six weeks ago, but the content style has not changed in over a year.',
      minTrust: 0, minOpenness: 0, minTurn: 1,   // free cue — the thread to pull
    },
    {
      id: 'competitor',
      text: "A new brand called ChaiGo launched around six weeks back — 'somewhere around when things dipped, I think' — selling at a noticeably lower price.",
      minTrust: 0, minOpenness: 6.5, minTurn: 3, // needs her genuinely talkative
    },
    {
      id: 'discount_dms',
      text: 'Customers keep sending DMs asking whether Kahva ever does discounts or combo offers.',
      minTrust: 7.5, minOpenness: 0, minTurn: 3, // needs her to actually trust you
    },
  ],
  constraints: [
    { topic: 'budget', reveal: 'Marketing budget is about ₹15,000/month. Only reveal if asked.' },
    { topic: 'past attempts', reveal: 'Tried a collab with a meme page two months ago; no effect. Only reveal if asked.' },
  ],
  openingLine:
    "Hi! Thanks for making time. So — I run Kahva, we sell masala chai blends online. I'll be honest, I'm here because our Instagram just isn't working anymore. Sales have slowed and I'm pretty sure our posts are the problem, they look dated. I want help making better content. Reels, maybe?",
};

module.exports = { L2_INSTANCE, instanceForSession };
