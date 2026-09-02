// L2 hidden-brief instance — Problem Framing, "stated ≠ actual".
// TEMPLATE STRUCTURE is what gets standardized per level; instances are
// generated fresh per candidate in production. This is one hand-authored
// instance for the prototype.
//
// PRIVATE: never expose actualProblem or cues to the candidate UI.

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
  cues: [
    {
      id: 'timing',
      text: 'Sales dipped about six weeks ago, but the content style has not changed in over a year.',
      minTrust: 0, minOpenness: 0, // free cue — dropped early
    },
    {
      id: 'competitor',
      text: "A new brand called ChaiGo launched around six weeks back — 'somewhere around when things dipped, I think' — selling at a noticeably lower price.",
      minTrust: 0, minOpenness: 5,
    },
    {
      id: 'discount_dms',
      text: 'Customers keep sending DMs asking whether Kahva ever does discounts or combo offers.',
      minTrust: 6, minOpenness: 0,
    },
  ],
  constraints: [
    { topic: 'budget', reveal: 'Marketing budget is about ₹15,000/month. Only reveal if asked.' },
    { topic: 'past attempts', reveal: 'Tried a collab with a meme page two months ago; no effect. Only reveal if asked.' },
  ],
  openingLine:
    "Hi! Thanks for making time. So — I run Kahva, we sell masala chai blends online. I'll be honest, I'm here because our Instagram just isn't working anymore. Sales have slowed and I'm pretty sure our posts are the problem, they look dated. I want help making better content. Reels, maybe?",
};

module.exports = { L2_INSTANCE };
