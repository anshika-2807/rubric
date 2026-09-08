// Visual Layout & Composition session — the canvas.
//
// Structure follows the design mock (elements tray · gridded canvas · brief
// panel), built as a real drag surface. Fixed-size elements, position only:
// this assesses composition, not typesetting, so everything except position is
// locked, which is also what makes the result measurable.

const { layout, esc, rubi, jsonScript } = require('./layout');

function render({ skill, user }) {
  const v = skill.verification;

  const head = `<style>
  .comp-grid { display: grid; grid-template-columns: 220px 1fr 300px; gap: 18px; align-items: start; }
  @media (max-width: 1000px) { .comp-grid { grid-template-columns: 1fr } }

  .tray { background: #fff; border: 1px solid var(--line); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .tray-chip {
    width: 100%; text-align: left; background: var(--paper); border: 1px solid var(--line);
    padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; cursor: pointer; font-family: var(--sans);
  }
  .tray-chip:hover { border-color: #000; }

  #stage { background: var(--paper-alt); border: 1px solid var(--line); padding: 2px; display: flex; justify-content: center; }
  #canvas {
    position: relative; background: #fff; overflow: hidden;
    background-image: linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px);
    box-shadow: 4px 4px 0 rgba(0,0,0,.06);
  }
  .canvas-el {
    position: absolute; box-sizing: border-box; cursor: grab; user-select: none; touch-action: none;
    border: 1px solid rgba(0,0,0,.35); background: rgba(255,255,255,.85); overflow: hidden;
    display: flex; flex-direction: column; justify-content: center; gap: 3px; padding: 6px 8px;
  }
  .canvas-el.dragging { cursor: grabbing; border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); z-index: 20; }
  .canvas-el .el-tag { font-family: var(--mono); font-size: 8px; letter-spacing: .1em; text-transform: uppercase; opacity: .5; }
  .canvas-el .el-text { font-family: var(--serif); font-size: 13px; line-height: 1.15; }
  .canvas-el.kind-type .el-text { font-weight: 500; }
  .canvas-el.kind-image { background: repeating-linear-gradient(45deg, #eee, #eee 6px, #f6f6f6 6px, #f6f6f6 12px); }
  .canvas-el.kind-form { background: var(--accent); }
  .canvas-el.kind-form .el-tag { color: #000; opacity: .7; }
  .canvas-el.kind-logo { background: #000; color: #fff; }
  .canvas-el.kind-logo .el-tag { color: var(--accent); opacity: 1; }
</style>`;

  const body = `
<div class="shell-wide" style="padding-bottom:56px">

  <header class="row between wrap gap-14" style="background:#000;color:#fff;padding:13px 20px;margin:0 -28px 22px">
    <div class="row gap-24 wrap">
      <span class="brand-word" style="font-size:17px">rubrik<span>.</span></span>
      <span class="label" style="display:inline;opacity:.55">${esc(skill.name)} · ${esc(v.competency)} · ${esc(v.level)}</span>
    </div>
    <div class="row gap-18 wrap">
      <span class="label label-accent" id="phaseLabel" style="display:inline">Round 1 · Compose</span>
      <span class="label" style="display:inline;opacity:.55"><span class="dot"></span> Scoring hidden until you finish</span>
    </div>
  </header>

  <div class="comp-grid">

    <aside class="tray" aria-label="Elements to place">
      <span class="label">Elements</span>
      <p class="small" style="opacity:.6;margin-bottom:4px">Click to place, then drag to position.</p>
      <div id="palette"></div>
    </aside>

    <div>
      <div id="stage" aria-label="Poster canvas"><div id="canvas"></div></div>
      <p class="small mt-8" id="status" style="min-height:20px;opacity:.7"></p>
    </div>

    <aside class="stack gap-18">
      <div class="panel" id="briefBox"><span class="label">Brief · Round 1</span><p class="small mt-8">Loading…</p></div>

      <div class="stack gap-8" id="rationaleWrap" hidden>
        <label class="label" for="rationale">Your rationale</label>
        <textarea class="field" id="rationale" rows="5" maxlength="1500"
          placeholder="What did you change to meet the new brief, and what did you deliberately keep? Name the elements."></textarea>
        <p class="small" style="opacity:.6">This is scored against an anchor — and checked against what actually moved, so describe what you really did.</p>
      </div>

      <button class="btn btn-accent" id="submit">Submit composition</button>

      <div class="notice">
        <span class="notice-mark">◆</span>
        <span>Element sizes and text are fixed — you are being assessed on <strong>arrangement</strong>, not on
        typesetting or copy. The geometry of what you submit is measured directly.</span>
      </div>
    </aside>
  </div>
</div>

${jsonScript('session-config', {
  startUrl: '/api/composition/start',
  round1Url: '/api/composition/submit-round1',
  endUrl: '/api/composition/end',
})}`;

  return layout({
    title: `${v.competency} ${v.level}`,
    here: '',
    head,
    body,
    tail: `<script src="/js/session-composition.js" defer></script>`,
    rubi: rubi('focused', `"Compose it. Then I <span style="color:#fa6519">change</span> it."`),
  });
}

module.exports = { render };
