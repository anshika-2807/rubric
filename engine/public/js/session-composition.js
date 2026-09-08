// Composition session — client script.
//
// Position-only drag: elements have fixed size and content, and the candidate
// arranges them on a scaled canvas. Everything of consequence is decided
// server-side; this script submits coordinates and never sees the scoring rules
// or the brief change before round 1 is in.

(function () {
  'use strict';

  var cfg = JSON.parse(document.getElementById('session-config').textContent);

  var stage = document.getElementById('stage');
  var canvasEl = document.getElementById('canvas');
  var palette = document.getElementById('palette');
  var status = document.getElementById('status');
  var briefBox = document.getElementById('briefBox');
  var submitBtn = document.getElementById('submit');
  var phaseLabel = document.getElementById('phaseLabel');
  var rationaleWrap = document.getElementById('rationaleWrap');
  var rationale = document.getElementById('rationale');

  var state = {
    sessionId: null,
    canvas: null,
    elements: [],       // element definitions
    layout: {},         // { id: {x, y} } in canvas coordinates
    scale: 1,
    phase: 'round1',
    dragging: null,
  };

  function say(msg, tone) {
    status.textContent = msg || '';
    status.style.color = tone === 'error' ? '#b00' : '';
  }

  async function api(url, body) {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  // ── scaling: canvas is up to 800×1200; fit it into the stage width ──────────

  function computeScale() {
    var avail = stage.clientWidth - 4;
    state.scale = Math.min(1, avail / state.canvas.width);
    canvasEl.style.width = (state.canvas.width * state.scale) + 'px';
    canvasEl.style.height = (state.canvas.height * state.scale) + 'px';
    canvasEl.style.backgroundSize = (state.canvas.grid * state.scale) + 'px ' + (state.canvas.grid * state.scale) + 'px';
  }

  // ── rendering ────────────────────────────────────────────────────────────

  function elDef(id) { return state.elements.find(function (e) { return e.id === id; }); }

  function renderElement(def) {
    var node = document.getElementById('el-' + def.id);
    var pos = state.layout[def.id];
    if (!pos) { if (node) node.remove(); return; }
    if (!node) {
      node = document.createElement('div');
      node.id = 'el-' + def.id;
      node.className = 'canvas-el kind-' + def.kind.split(' ')[0].toLowerCase();
      node.setAttribute('data-id', def.id);
      node.innerHTML = '<span class="el-tag">' + def.label + '</span>' +
        (def.text ? '<span class="el-text">' + def.text + '</span>' : '');
      canvasEl.appendChild(node);
      attachDrag(node, def);
    }
    node.style.width = (def.w * state.scale) + 'px';
    node.style.height = (def.h * state.scale) + 'px';
    node.style.left = (pos.x * state.scale) + 'px';
    node.style.top = (pos.y * state.scale) + 'px';
  }

  function renderAll() {
    state.elements.forEach(function (def) { if (state.layout[def.id]) renderElement(def); });
    renderPalette();
  }

  function renderPalette() {
    palette.innerHTML = '';
    var unplaced = state.elements.filter(function (e) { return !state.layout[e.id]; });
    if (!unplaced.length) {
      palette.innerHTML = '<p class="small" style="opacity:.55">All elements are on the canvas.</p>';
      return;
    }
    unplaced.forEach(function (def) {
      var chip = document.createElement('button');
      chip.className = 'tray-chip';
      chip.type = 'button';
      chip.innerHTML = '<span class="mono" style="font-size:9px;opacity:.55">' + def.kind + '</span>' +
        '<span style="font-size:13px;font-weight:500">' + def.label + '</span>' +
        '<span class="mono" style="font-size:9px;color:var(--accent)">place →</span>';
      chip.addEventListener('click', function () {
        // Drop into the first open-ish spot near the top-left.
        var n = Object.keys(state.layout).length;
        state.layout[def.id] = {
          x: Math.min(state.canvas.safeMargin + (n % 3) * 40, state.canvas.width - def.w),
          y: Math.min(state.canvas.safeMargin + Math.floor(n / 3) * 40, state.canvas.height - def.h)
        };
        renderElement(def);
        renderPalette();
        markDirty();
      });
      palette.appendChild(chip);
    });
  }

  // ── dragging ───────────────────────────────────────────────────────────────

  function attachDrag(node, def) {
    node.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      node.setPointerCapture(e.pointerId);
      node.classList.add('dragging');
      var start = { px: e.clientX, py: e.clientY, x: state.layout[def.id].x, y: state.layout[def.id].y };
      state.dragging = def.id;

      function move(ev) {
        var dx = (ev.clientX - start.px) / state.scale;
        var dy = (ev.clientY - start.py) / state.scale;
        var x = Math.round(start.x + dx);
        var y = Math.round(start.y + dy);
        // Clamp within the canvas so an element cannot be dragged off entirely.
        x = Math.max(0, Math.min(x, state.canvas.width - def.w));
        y = Math.max(0, Math.min(y, state.canvas.height - def.h));
        state.layout[def.id] = { x: x, y: y };
        node.style.left = (x * state.scale) + 'px';
        node.style.top = (y * state.scale) + 'px';
      }
      function up(ev) {
        node.releasePointerCapture(e.pointerId);
        node.classList.remove('dragging');
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        state.dragging = null;
        markDirty();
      }
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
    });
  }

  var dirty = false;
  function markDirty() { dirty = true; }

  // ── phases ───────────────────────────────────────────────────────────────

  async function begin() {
    say('Preparing the canvas…');
    try {
      var data = await api(cfg.startUrl, {});
      state.sessionId = data.sessionId;
      state.canvas = data.canvas;
      state.elements = data.elements;
      computeScale();
      briefBox.innerHTML = '<span class="label">Brief · Round 1</span><p class="small mt-8" style="opacity:.85">' +
        escapeHtml(data.originalBrief) + '</p>';
      renderPalette();
      say(data.mockMode
        ? 'Demo mode: geometry is measured for real; the rationale is scored by heuristic.'
        : 'Arrange all elements, then submit. You cannot revise round 1 afterwards.');
    } catch (e) {
      say(e.message, 'error');
    }
  }

  async function submitRound1() {
    submitBtn.disabled = true;
    say('Submitting your first composition…');
    try {
      var data = await api(cfg.round1Url, { sessionId: state.sessionId, layout: state.layout });
      state.phase = 'round2';

      // Merge any newly introduced element into the working set.
      (data.newElements || []).forEach(function (ne) {
        if (!elDef(ne.id)) state.elements.push(ne);
      });

      phaseLabel.textContent = 'Round 2 · Adapt';
      briefBox.className = 'panel-accent';
      briefBox.innerHTML = '<span class="label" style="opacity:1;color:#000">The brief just changed ↓</span>' +
        '<p class="serif" style="font-size:18px;line-height:1.35;margin-top:10px">' + escapeHtml(data.change.headline) + '</p>' +
        '<p class="small mt-8" style="opacity:.85">' + escapeHtml(data.change.detail) + '</p>' +
        '<p class="mono mt-8" style="font-size:10px;letter-spacing:.06em">JUDGED ON: ' + escapeHtml(data.change.judgedOn).toUpperCase() + '</p>';

      rationaleWrap.hidden = false;
      submitBtn.textContent = 'Submit adaptation & score';
      submitBtn.disabled = false;
      renderPalette();
      say('Adapt the composition you already have. Do not start over — what you keep is measured. Then explain your trade-off.');
      briefBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      submitBtn.disabled = false;
      say(e.message, 'error');
    }
  }

  async function submitRound2() {
    var text = rationale.value.trim();
    if (text.length < 10) { rationale.focus(); return say('Add a sentence or two explaining what you changed and why.', 'error'); }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Scoring…';
    say('Measuring your composition and scoring the adaptation.');
    try {
      var data = await api(cfg.endUrl, { sessionId: state.sessionId, layout: state.layout, rationale: text });
      window.location.href = data.resultUrl;
    } catch (e) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit adaptation & score';
      say(e.message, 'error');
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  submitBtn.addEventListener('click', function () {
    if (state.phase === 'round1') submitRound1();
    else submitRound2();
  });

  window.addEventListener('resize', function () {
    if (state.canvas) { computeScale(); renderAll(); }
  });

  window.addEventListener('beforeunload', function (e) {
    if (state.sessionId && state.phase !== 'done') { e.preventDefault(); e.returnValue = ''; }
  });

  begin();
})();
