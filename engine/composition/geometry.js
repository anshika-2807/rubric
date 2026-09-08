// Deterministic composition measurement.
//
// Nothing here is a judgement. Every value is computed from the coordinates the
// candidate submitted, which is why five of the six anchors for this competency
// can be decided without a language model — and why the same layout always
// produces the same score.
//
// This is the counterpart to the consultancy trust curve: a second evidence
// stream that is arithmetic rather than opinion, and therefore not something a
// candidate can talk their way past.

/** Rectangle for a placed element. */
function rect(el, pos) {
  return { id: el.id, x: pos.x, y: pos.y, w: el.w, h: el.h, right: pos.x + el.w, bottom: pos.y + el.h };
}

function overlapArea(a, b) {
  const dx = Math.min(a.right, b.right) - Math.max(a.x, b.x);
  const dy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
  return dx > 0 && dy > 0 ? dx * dy : 0;
}

const ALIGN_TOL = 10;   // px — within this, two edges read as aligned
const GRID_TOL = 8;     // px — within this, a position reads as on-grid
const CLEARANCE = 24;   // px — breathing room a focal element needs

/**
 * Measure one layout.
 *
 * @param {object} layout    { elementId: {x, y} }
 * @param {Array}  elements  element definitions in play
 * @param {object} canvas    { width, height, safeMargin, grid }
 */
function measure(layout, elements, canvas) {
  const placed = [];
  const missing = [];
  for (const el of elements) {
    const pos = layout[el.id];
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) missing.push(el.id);
    else placed.push(rect(el, pos));
  }

  // ── Containment
  const outOfBounds = placed.filter(r =>
    r.x < 0 || r.y < 0 || r.right > canvas.width || r.bottom > canvas.height).map(r => r.id);

  const m = canvas.safeMargin;
  const marginBreaches = placed.filter(r =>
    r.x < m || r.y < m || r.right > canvas.width - m || r.bottom > canvas.height - m).map(r => r.id);

  // ── Collisions. Text over text is a real fault; a text block sitting on the
  // photo plate or accent shape is a legitimate compositional choice, so only
  // essential-on-essential overlaps count against the candidate.
  const essentialIds = new Set(elements.filter(e => e.essential).map(e => e.id));
  const collisions = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j];
      if (!essentialIds.has(a.id) || !essentialIds.has(b.id)) continue;
      const area = overlapArea(a, b);
      if (area > 0) collisions.push({ pair: [a.id, b.id], area: Math.round(area) });
    }
  }

  // ── Alignment. Count shared edges and centre axes; the dominant axis is the
  // one the most elements agree on.
  const axes = {};
  const addAxis = (kind, value, id) => {
    const key = `${kind}:${Math.round(value / ALIGN_TOL) * ALIGN_TOL}`;
    (axes[key] = axes[key] || { kind, value, ids: new Set() }).ids.add(id);
  };
  for (const r of placed) {
    addAxis('left', r.x, r.id);
    addAxis('right', r.right, r.id);
    addAxis('centerX', r.x + r.w / 2, r.id);
    addAxis('top', r.y, r.id);
  }
  const groups = Object.values(axes)
    .map(a => ({ kind: a.kind, value: Math.round(a.value), count: a.ids.size, ids: [...a.ids] }))
    .filter(a => a.count >= 2)
    .sort((a, b) => b.count - a.count);

  const dominantAxis = groups[0] || null;
  const alignedIds = new Set(groups.flatMap(g => g.ids));
  const alignedFraction = placed.length ? alignedIds.size / placed.length : 0;

  // ── Grid adherence
  const onGrid = placed.filter(r =>
    Math.abs(r.x % canvas.grid) <= GRID_TOL || Math.abs(canvas.grid - (r.x % canvas.grid)) <= GRID_TOL).length;
  const gridAdherence = placed.length ? onGrid / placed.length : 0;

  // ── Hierarchy. With element sizes fixed, hierarchy is entirely a question of
  // PLACEMENT: is the heaviest element given a prominent position and room to
  // breathe, or is it crowded and buried?
  const weights = placed.map(r => {
    const el = elements.find(e => e.id === r.id);
    return { id: r.id, weight: r.w * r.h * (el.weight || 1) };
  });
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0) || 1;
  const heaviest = weights.slice().sort((a, b) => b.weight - a.weight)[0] || null;

  let hierarchy = { dominantId: null, dominantShare: 0, inUpperField: false, clear: false, crowdedBy: [], hasFocalPoint: false };
  if (heaviest) {
    const r = placed.find(p => p.id === heaviest.id);
    const centreY = r.y + r.h / 2;
    const crowdedBy = placed.filter(o => o.id !== r.id && overlapArea(
      { x: r.x - CLEARANCE, y: r.y - CLEARANCE, right: r.right + CLEARANCE, bottom: r.bottom + CLEARANCE }, o) > 0
    ).map(o => o.id);
    const collidesWithFocal = collisions.some(c => c.pair.includes(r.id));
    hierarchy = {
      dominantId: r.id,
      dominantShare: Number((heaviest.weight / totalWeight).toFixed(3)),
      inUpperField: centreY <= canvas.height * 0.55,
      clear: crowdedBy.length === 0 && !collidesWithFocal,
      crowdedBy,
      hasFocalPoint: !collidesWithFocal && centreY <= canvas.height * 0.6,
    };
  }

  // ── Balance. Centre of visual mass against the canvas centre.
  const cx = weights.reduce((s, w) => {
    const r = placed.find(p => p.id === w.id);
    return s + (r.x + r.w / 2) * w.weight;
  }, 0) / totalWeight;
  const cy = weights.reduce((s, w) => {
    const r = placed.find(p => p.id === w.id);
    return s + (r.y + r.h / 2) * w.weight;
  }, 0) / totalWeight;
  const offsetX = Number(((cx - canvas.width / 2) / canvas.width).toFixed(3));
  const offsetY = Number(((cy - canvas.height / 2) / canvas.height).toFixed(3));

  // ── Whitespace
  const inkArea = placed.reduce((s, r) => s + r.w * r.h, 0);
  const coverage = Number((inkArea / (canvas.width * canvas.height)).toFixed(3));

  return {
    placedCount: placed.length,
    totalElements: elements.length,
    missing,
    outOfBounds,
    marginBreaches,
    collisions,
    alignment: {
      alignedFraction: Number(alignedFraction.toFixed(3)),
      groupCount: groups.length,
      dominantAxis: dominantAxis ? { kind: dominantAxis.kind, value: dominantAxis.value, count: dominantAxis.count } : null,
    },
    gridAdherence: Number(gridAdherence.toFixed(3)),
    hierarchy,
    balance: { offsetX, offsetY, centroid: { x: Math.round(cx), y: Math.round(cy) } },
    whitespace: { coverage, inBand: coverage >= 0.18 && coverage <= 0.62 },
  };
}

const MOVE_EPSILON = 6;   // px — below this a position counts as unchanged

/**
 * Compare two rounds.
 *
 * This is what separates adapting from restarting, and it is the reason the
 * assessment can make that claim at all: it is measured, not inferred from what
 * the candidate says they did.
 */
function delta(layoutA, layoutB, elements, canvas) {
  const diagonal = Math.hypot(canvas.width, canvas.height);
  const shared = elements.filter(e => layoutA[e.id] && layoutB[e.id]);

  const moves = shared.map(e => {
    const a = layoutA[e.id], b = layoutB[e.id];
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    return { id: e.id, distance: Math.round(distance), ratio: Number((distance / diagonal).toFixed(3)) };
  });

  const moved = moves.filter(m => m.distance > MOVE_EPSILON);
  const added = elements.filter(e => !layoutA[e.id] && layoutB[e.id]).map(e => e.id);
  const removed = elements.filter(e => layoutA[e.id] && !layoutB[e.id]).map(e => e.id);

  const movedFraction = shared.length ? moved.length / shared.length : 0;
  const meanRatio = moved.length ? moved.reduce((s, m) => s + m.ratio, 0) / moved.length : 0;
  const maxRatio = moved.reduce((s, m) => Math.max(s, m.ratio), 0);

  // A restart is a wholesale relocation: almost everything moved, and moved far.
  // Either alone is normal — reflowing a column moves many elements a little, and
  // repositioning one block moves it a long way.
  const restart = movedFraction > 0.85 && meanRatio > 0.22;
  const noop = moved.length === 0 && added.length === 0;

  return {
    moved: moved.map(m => m.id),
    movedDetail: moved,
    unmoved: moves.filter(m => m.distance <= MOVE_EPSILON).map(m => m.id),
    added,
    removed,
    movedFraction: Number(movedFraction.toFixed(3)),
    meanDisplacementRatio: Number(meanRatio.toFixed(3)),
    maxDisplacementRatio: Number(maxRatio.toFixed(3)),
    preservedFraction: Number((1 - movedFraction).toFixed(3)),
    restart,
    noop,
  };
}

/**
 * Normalise a client-submitted layout.
 *
 * Everything arriving from the browser is untrusted: coordinates are coerced to
 * finite numbers, rounded, clamped to a sane range, and any key that is not a
 * known element id is dropped. A layout cannot carry extra fields into scoring.
 */
function sanitiseLayout(raw, elements, canvas) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const limit = Math.max(canvas.width, canvas.height) * 2;
  for (const el of elements) {
    const pos = raw[el.id];
    if (!pos || typeof pos !== 'object') continue;
    const x = Number(pos.x), y = Number(pos.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    out[el.id] = {
      x: Math.round(Math.min(Math.max(x, -limit), limit)),
      y: Math.round(Math.min(Math.max(y, -limit), limit)),
    };
  }
  return out;
}

module.exports = { measure, delta, sanitiseLayout, MOVE_EPSILON };
