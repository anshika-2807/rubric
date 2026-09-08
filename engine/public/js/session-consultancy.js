// Consultancy session — client script.
//
// Deliberately thin. It renders turns and reports integrity telemetry; it holds
// no scoring logic, no thresholds and no knowledge of the scenario. Everything it
// knows arrived from the server, and the verdict is fetched from a URL the server
// hands back — so there is nothing here worth tampering with.

(function () {
  'use strict';

  var cfg = JSON.parse(document.getElementById('session-config').textContent);

  var chat = document.getElementById('chat');
  var input = document.getElementById('input');
  var sendBtn = document.getElementById('send');
  var endBtn = document.getElementById('end');
  var status = document.getElementById('status');
  var heading = document.getElementById('clientHeading');
  var turnCount = document.getElementById('turnCount');

  var sessionId = null;
  var busy = false;
  var ended = false;
  var telemetry = { focusLosses: 0, pasteBlocks: 0 };

  // ── helpers ────────────────────────────────────────────────────────────────

  function say(msg, tone) {
    status.textContent = msg || '';
    status.style.color = tone === 'error' ? '#b00' : '';
  }

  function addMsg(role, text) {
    var el = document.createElement('div');
    el.className = 'msg ' + role;
    var who = document.createElement('span');
    who.className = 'who';
    who.textContent = role === 'client' ? 'CLIENT' : role === 'cand' ? 'YOU' : 'SESSION';
    var p = document.createElement('p');
    p.textContent = text;               // textContent, never innerHTML
    el.appendChild(who);
    el.appendChild(p);
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'typing';
    el.innerHTML = '<i></i><i></i><i></i>';
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
    return el;
  }

  async function api(url, body) {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
    return data;
  }

  function setEnabled(on) {
    busy = !on;
    input.disabled = !on;
    sendBtn.disabled = !on;
    endBtn.disabled = !on;
  }

  // ── debug panel (only rendered when the server enabled it) ─────────────────

  function renderDebug(debug) {
    if (!cfg.debug || !debug) return;
    var bars = document.getElementById('stateBars');
    var trace = document.getElementById('ruleTrace');
    if (!bars) return;
    var s = debug.state;
    bars.innerHTML = '';
    [['Trust', s.trust], ['Openness', s.openness], ['Frustration', s.frustration]].forEach(function (pair) {
      var wrap = document.createElement('div');
      wrap.style.fontSize = '11px';
      wrap.textContent = pair[0] + ' ' + pair[1];
      var track = document.createElement('div');
      track.style.cssText = 'height:8px;background:#eaeaea;margin-top:4px';
      var fill = document.createElement('div');
      fill.style.cssText = 'height:100%;background:#fa6519;width:' + (pair[1] * 10) + '%';
      track.appendChild(fill);
      wrap.appendChild(track);
      bars.appendChild(wrap);
    });
    trace.textContent = (debug.applied || []).join(' · ') +
      ' || unlocked: ' + (debug.unlockedCues || []).join(', ');
  }

  // ── flow ───────────────────────────────────────────────────────────────────

  async function begin() {
    say('Starting the session…');
    try {
      var data = await api(cfg.startUrl, {});
      sessionId = data.sessionId;
      heading.textContent = data.clientName + ' — ' + data.clientRole.split(',')[0];
      addMsg('client', data.opening);
      setEnabled(true);
      input.focus();
      say(data.mockMode
        ? 'Demo mode: the client is scripted and scoring is heuristic. The flow is real.'
        : 'You have ' + data.maxTurns + ' turns. Take your time.');
    } catch (e) {
      say(e.message, 'error');
      addMsg('sys', 'The session could not be started. Reload the page to try again.');
    }
  }

  async function send() {
    if (busy || ended) return;
    var text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMsg('cand', text);
    setEnabled(false);
    var typing = showTyping();
    say('');

    try {
      var data = await api(cfg.messageUrl, { sessionId: sessionId, message: text });
      typing.remove();
      addMsg('client', data.reply);
      turnCount.textContent = 'Turn ' + data.turn;
      renderDebug(data.debug);
      setEnabled(true);
      input.focus();
      if (data.turnsRemaining <= 5) {
        say(data.turnsRemaining + ' turn' + (data.turnsRemaining === 1 ? '' : 's') + ' left before you must end the session.');
      }
    } catch (e) {
      typing.remove();
      // The turn is spent but the session survives, so recovery is just retrying.
      addMsg('sys', 'That message did not get through. Your session is still open — try again.');
      say(e.message, 'error');
      setEnabled(true);
    }
  }

  async function end() {
    if (busy || ended) return;
    if (!confirm('End the session and be scored? You cannot return to this conversation.')) return;

    ended = true;
    setEnabled(false);
    endBtn.textContent = 'Evaluating…';
    say('Scoring your session against the anchors. This takes a moment.');

    try {
      var data = await api(cfg.endUrl, { sessionId: sessionId, telemetry: telemetry });
      window.location.href = data.resultUrl;
    } catch (e) {
      ended = false;
      endBtn.textContent = 'End & score';
      setEnabled(true);
      say(e.message + ' Your conversation is intact — you can try ending again.', 'error');
    }
  }

  // ── integrity telemetry: recorded, never scored ────────────────────────────

  input.addEventListener('paste', function (e) {
    var text = (e.clipboardData || window.clipboardData).getData('text') || '';
    if (text.length > 5) {
      e.preventDefault();
      telemetry.pasteBlocks++;
      say('Pasting is blocked in this box. Type it in your own words.');
    }
  });

  window.addEventListener('blur', function () { if (!ended) telemetry.focusLosses++; });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);
  endBtn.addEventListener('click', end);

  window.addEventListener('beforeunload', function (e) {
    if (sessionId && !ended) { e.preventDefault(); e.returnValue = ''; }
  });

  begin();
})();
