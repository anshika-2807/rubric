// Behavioral state machine — the deterministic core of the persona engine.
// AI generates words; THESE RULES govern the client's internal state.
// Same physics for every candidate = comparability.

class ClientState {
  constructor() {
    this.trust = 5;        // 0–10
    this.openness = 4;     // 0–10
    this.frustration = 0;  // 0–10
    this.closedStreak = 0; // consecutive turns that were closed-question-only
    this.trajectory = [{ turn: 0, trust: this.trust, openness: this.openness, frustration: this.frustration, applied: [] }];
  }

  _clamp(v) { return Math.max(0, Math.min(10, Math.round(v * 2) / 2)); }

  // behaviors: output of classifier.js for one candidate turn
  update(behaviors, turn) {
    const applied = [];
    const bump = (field, delta, rule) => {
      this[field] = this._clamp(this[field] + delta);
      applied.push(`${rule}: ${field} ${delta > 0 ? '+' : ''}${delta}`);
    };

    if (behaviors.accurate_reflection) { bump('trust', 1, 'accurate_reflection'); bump('openness', 1, 'accurate_reflection'); }
    if (behaviors.inaccurate_reflection) bump('trust', -1, 'inaccurate_reflection');
    if (behaviors.empathy) bump('trust', 0.5, 'empathy');
    if (behaviors.open_question) { bump('openness', 0.5, 'open_question'); this.closedStreak = 0; }
    if (behaviors.closed_question && !behaviors.open_question) {
      this.closedStreak += 1;
      if (this.closedStreak >= 3) { bump('openness', -1, 'closed_question_streak'); this.closedStreak = 0; }
    }
    if (behaviors.rapid_fire) bump('openness', -0.5, 'rapid_fire');
    if (behaviors.solution_jump) { bump('openness', -1, 'solution_jump'); bump('frustration', 1, 'solution_jump'); }
    if (behaviors.dismissive) { bump('trust', -2, 'dismissive'); bump('frustration', 2, 'dismissive'); }
    if (behaviors.reframe_attempt && (behaviors.cited_cues || []).length > 0) bump('trust', 1, 'evidence_based_reframe');

    this.trajectory.push({ turn, trust: this.trust, openness: this.openness, frustration: this.frustration, applied });
    return applied;
  }

  unlockedCues(cues) {
    return cues.filter(c => this.trust >= (c.minTrust || 0) && this.openness >= (c.minOpenness || 0));
  }

  // Natural-language style directives injected into the persona prompt each turn.
  styleDirectives() {
    const d = [];
    if (this.trust <= 3) d.push('You feel guarded. Give shorter answers; do not volunteer extra details.');
    else if (this.trust >= 7) d.push('You feel understood and comfortable. Speak freely, share more context.');
    if (this.openness >= 6) d.push('You are in a talkative mood — ramble a little, drift into side details (this is where you may drop cues).');
    else if (this.openness <= 2) d.push('You answer only what is asked, in one or two sentences.');
    if (this.frustration >= 6) d.push('You are visibly impatient. Be curt. Hint that you are not sure this is going anywhere.');
    else if (this.frustration >= 3) d.push('You are slightly impatient; gently steer back to what YOU came for.');
    return d;
  }

  snapshot() { return { trust: this.trust, openness: this.openness, frustration: this.frustration }; }
}

module.exports = { ClientState };
