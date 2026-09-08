// Composition brief instance — Visual Layout & Composition, L2.
//
// PRIVATE: the brief CHANGE and its constraint checks must never reach the
// browser before round 1 is submitted. The candidate sees the change only after
// committing, because "adapt what you already built" is the whole assessment —
// knowing the change in advance turns it into an ordinary layout task.
//
// The elements are fixed in size and content. That is deliberate: the candidate
// is being assessed on composition, not on typesetting or image selection, and
// fixing everything except position makes the result measurable.

const CANVAS = { width: 800, height: 1200, safeMargin: 48, grid: 32 };

// `weight` is a visual-emphasis multiplier applied to area when computing which
// element dominates. Display type reads far heavier than its box area suggests;
// small meta text reads lighter.
const ELEMENTS = [
  { id: 'title',   label: 'Title block',   kind: 'TYPE · DISPLAY', w: 420, h: 210, weight: 1.6, essential: true,  text: 'Late Bloom' },
  { id: 'kicker',  label: 'Kicker',        kind: 'TYPE · EYEBROW', w: 300, h: 24,  weight: 0.3, essential: true,  text: 'CAMPUS · FILM · FEST' },
  { id: 'tagline', label: 'Tagline',       kind: 'TYPE · BODY',    w: 320, h: 76,  weight: 0.5, essential: true,  text: 'Five nights of student film. Open-air on the quad.' },
  { id: 'meta',    label: 'Date & venue',  kind: 'META',           w: 300, h: 34,  weight: 0.4, essential: true,  text: 'APR 18–22 · THE QUAD · 7PM' },
  { id: 'photo',   label: 'Photo plate',   kind: 'IMAGE',          w: 280, h: 340, weight: 1.0, essential: false },
  { id: 'accent',  label: 'Accent shape',  kind: 'FORM',           w: 160, h: 160, weight: 1.1, essential: false },
  { id: 'mark',    label: 'Festival mark', kind: 'LOGO',           w: 96,  h: 96,  weight: 0.6, essential: true },
];

// Introduced only by a brief change.
const SPONSOR = { id: 'sponsor', label: 'Sponsor mark', kind: 'LOGO · PARTNER', w: 132, h: 60, weight: 0.4, essential: false };

const ORIGINAL_BRIEF =
  'Poster for a campus film festival. Friendly, independent tone. Use every element supplied: ' +
  'title, kicker, tagline, date and venue, the photo plate, one accent shape and the festival mark.';

// ─── Brief changes ───────────────────────────────────────────────────────────
//
// Every change is STRUCTURALLY CHECKABLE. That constraint on the design of the
// assessment is what makes it honest: "make it feel more horror-themed" — the
// change the original mock proposed — cannot be verified from coordinates, so
// scoring it would mean asking a model for an aesthetic opinion and calling the
// answer a verification. Each change below either holds or does not, and the
// candidate can tell which.
//
// `check` receives the round-2 layout and returns the individual requirements
// with their outcomes, so the result page can show exactly what held.

const BRIEF_CHANGES = [
  {
    id: 'square-crop',
    headline: 'The poster is now also a square social tile.',
    detail:
      'Marketing needs a 800 × 800 crop taken from the top of the poster. Everything essential — ' +
      'title, kicker, date and venue, and the festival mark — has to sit fully inside that top square. ' +
      'The tagline, photo and accent may fall outside it.',
    judgedOn: 'Whether the essentials survive the crop, and whether you adapt rather than restart.',
    requiredElements: [],
    check(layout, elements) {
      const limit = 800;
      const must = ['title', 'kicker', 'meta', 'mark'];
      return must.map(id => {
        const el = elements.find(e => e.id === id);
        const pos = layout[id];
        const bottom = pos ? pos.y + el.h : Infinity;
        return {
          requirement: `${el.label} sits fully inside the top ${limit}px`,
          satisfied: Boolean(pos) && bottom <= limit,
          measured: pos ? `bottom edge at ${Math.round(bottom)}px` : 'not placed',
        };
      });
    },
  },

  {
    id: 'sponsor-lockup',
    headline: 'A sponsor has come on board, and they must appear.',
    detail:
      'Place the sponsor mark. It cannot touch or overlap the title, it has to sit inside the safe ' +
      'margins, and it must not become the second thing you notice — it is a sponsor, not a headline.',
    judgedOn: 'Whether you make room for a new element without dismantling what already worked.',
    requiredElements: ['sponsor'],
    check(layout, elements, canvas) {
      const sponsor = elements.find(e => e.id === 'sponsor');
      const title = elements.find(e => e.id === 'title');
      const sp = layout.sponsor;
      const tp = layout.title;
      const out = [{
        requirement: 'Sponsor mark is placed on the canvas',
        satisfied: Boolean(sp),
        measured: sp ? `at ${Math.round(sp.x)}, ${Math.round(sp.y)}` : 'not placed',
      }];
      if (!sp) return out;

      const overlaps = tp && !(
        sp.x + sponsor.w <= tp.x || sp.x >= tp.x + title.w ||
        sp.y + sponsor.h <= tp.y || sp.y >= tp.y + title.h);
      out.push({
        requirement: 'Sponsor mark does not overlap the title',
        satisfied: !overlaps,
        measured: overlaps ? 'overlapping the title block' : 'clear of the title',
      });

      const m = canvas.safeMargin;
      const inside = sp.x >= m && sp.y >= m &&
        sp.x + sponsor.w <= canvas.width - m && sp.y + sponsor.h <= canvas.height - m;
      out.push({
        requirement: 'Sponsor mark is inside the safe margins',
        satisfied: inside,
        measured: inside ? 'within margins' : 'breaks the safe margin',
      });
      return out;
    },
  },

  {
    id: 'reading-order',
    headline: 'Ticket sales are behind. The date has to do more work.',
    detail:
      'Date and venue must become the second thing a viewer reads — immediately after the title in ' +
      'reading order — and it can no longer sit in the bottom third of the poster.',
    judgedOn: 'Whether you can re-sequence a composition without flattening its hierarchy.',
    requiredElements: [],
    check(layout, elements, canvas) {
      // Reading order approximated the way a Western reader scans: top to bottom,
      // then left to right within a band.
      const placed = elements
        .filter(e => layout[e.id])
        .map(e => ({ id: e.id, x: layout[e.id].x, y: layout[e.id].y }))
        .sort((a, b) => (Math.abs(a.y - b.y) > 40 ? a.y - b.y : a.x - b.x));

      const order = placed.map(p => p.id);
      const metaIndex = order.indexOf('meta');
      const titleIndex = order.indexOf('title');
      const meta = elements.find(e => e.id === 'meta');
      const mp = layout.meta;
      const bottomThird = canvas.height * (2 / 3);

      return [
        {
          requirement: 'Date & venue reads immediately after the title',
          satisfied: titleIndex !== -1 && metaIndex === titleIndex + 1,
          measured: metaIndex === -1 ? 'not placed' : `position ${metaIndex + 1} in reading order (title is ${titleIndex + 1})`,
        },
        {
          requirement: 'Date & venue is out of the bottom third',
          satisfied: Boolean(mp) && mp.y + meta.h <= bottomThird,
          measured: mp ? `bottom edge at ${Math.round(mp.y + meta.h)}px of ${Math.round(bottomThird)}px` : 'not placed',
        },
      ];
    },
  },
];

/**
 * Deterministic per-attempt selection.
 *
 * Varies the change between candidates so the assessment is not a single fixed
 * item, while staying reproducible from the attempt id — the same attempt always
 * re-derives the same change, which matters for auditing a stored result.
 */
function changeForAttempt(attemptId) {
  let h = 0;
  for (const ch of String(attemptId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BRIEF_CHANGES[h % BRIEF_CHANGES.length];
}

/** Elements in play for a given change (base set, plus anything it introduces). */
function elementsFor(change) {
  const extra = (change?.requiredElements || []).includes('sponsor') ? [SPONSOR] : [];
  return [...ELEMENTS, ...extra];
}

/** What the browser is allowed to know: geometry and labels, no scoring rules. */
function publicElements(elements) {
  return elements.map(({ id, label, kind, w, h, text, essential }) =>
    ({ id, label, kind, w, h, text: text || null, essential: Boolean(essential) }));
}

/** The change, minus its check function. */
function publicChange(change) {
  const { id, headline, detail, judgedOn, requiredElements } = change;
  return { id, headline, detail, judgedOn, requiredElements };
}

function instanceForSession(attemptId) {
  const change = changeForAttempt(attemptId);
  return {
    id: `CC-L2-FILMFEST-${change.id}`,
    canvas: CANVAS,
    originalBrief: ORIGINAL_BRIEF,
    change,
    elements: elementsFor(change),
  };
}

module.exports = {
  CANVAS, ELEMENTS, SPONSOR, ORIGINAL_BRIEF, BRIEF_CHANGES,
  changeForAttempt, elementsFor, publicElements, publicChange, instanceForSession,
};
