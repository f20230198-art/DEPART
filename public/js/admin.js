// Admin panel: round control + moderation. The PIN is re-checked by the server on every action.
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const socket = io({ transports: ['websocket', 'polling'] });

  let pin = sessionStorage.getItem('debugged_admin_pin') || '';
  let state = null;
  let clockOffset = 0;
  let filter = '';
  let lastPlayersSig = '';
  let lastBannedSig = '';

  const STATUS_LABEL = {
    lobby: 'In lobby', ready: 'Ready', playing: 'Playing', finished: 'Finished', waiting: 'Waiting next', idle: 'Online'
  };

  // ---------------------------------------------------------------- connect + gate
  function tryJoin(candidate) {
    pin = candidate;
    socket.emit('admin_join', { modKey: pin });
  }

  socket.on('connect', () => {
    $('admin-conn').textContent = 'Connected';
    $('admin-conn').className = 'chip chip-ok';
    if (pin) tryJoin(pin);
  });

  socket.on('disconnect', () => {
    $('admin-conn').textContent = 'Disconnected, retrying...';
    $('admin-conn').className = 'chip chip-bad';
  });

  socket.on('admin_ok', () => {
    sessionStorage.setItem('debugged_admin_pin', pin);
    $('admin-gate').hidden = true;
    $('admin-panel').hidden = false;
  });

  socket.on('admin_denied', () => {
    sessionStorage.removeItem('debugged_admin_pin');
    pin = '';
    $('admin-gate').hidden = false;
    $('admin-panel').hidden = true;
    const err = $('gate-error');
    err.classList.add('active');
    $('gate-pin').focus();
  });

  $('gate-form').addEventListener('submit', (e) => {
    e.preventDefault();
    $('gate-error').classList.remove('active');
    const value = $('gate-pin').value.trim();
    if (value) tryJoin(value);
  });

  // ---------------------------------------------------------------- actions
  const send = (event, extra = {}) => socket.emit(event, { modKey: pin, ...extra });

  $('mode-group').addEventListener('click', () => send('admin_set_mode', { mode: 'group' }));
  $('mode-free').addEventListener('click', () => send('admin_set_mode', { mode: 'free' }));
  $('reg-open').addEventListener('click', () => send('admin_registration', { open: true }));
  $('reg-closed').addEventListener('click', () => send('admin_registration', { open: false }));
  $('act-start').addEventListener('click', () => send('admin_start'));
  $('act-end').addEventListener('click', () => {
    if (confirm('End the round now for everyone?')) send('admin_end');
  });
  $('act-new').addEventListener('click', () => send('admin_new_round'));
  $('act-reset').addEventListener('click', () => {
    if (confirm('Clear the whole leaderboard? This cannot be undone.')) send('admin_reset_board');
  });

  $('player-search').addEventListener('input', (e) => {
    filter = e.target.value.trim().toLowerCase();
    lastPlayersSig = '';
    renderPlayers();
  });

  $('players-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const name = btn.dataset.name;
    if (btn.dataset.act === 'kick') {
      if (confirm(`Remove ${name} from the game? They can rejoin.`)) send('admin_kick', { id });
    } else if (btn.dataset.act === 'ban') {
      if (confirm(`Ban ${name}? They cannot rejoin with this name or device.`)) send('admin_ban', { id, name });
    }
  });

  $('banned-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (btn) send('admin_unban', { key: btn.dataset.key });
  });

  let toastTimer = null;
  socket.on('admin_feedback', (res) => {
    const toast = $('admin-toast');
    toast.textContent = res.message;
    toast.className = `admin-toast show ${res.ok ? 'ok' : 'bad'}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = 'admin-toast'; }, 3500);
  });

  // ---------------------------------------------------------------- render
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function renderRound() {
    if (!state) return;
    const r = state.round;
    clockOffset = r.serverNow - Date.now();
    const lobby = state.counts.lobby || 0;

    $('mode-group').classList.toggle('on', r.mode === 'group');
    $('mode-free').classList.toggle('on', r.mode === 'free');
    $('reg-open').classList.toggle('on', r.registrationOpen);
    $('reg-closed').classList.toggle('on', !r.registrationOpen);

    const phaseText = r.mode === 'free' ? 'FREE PLAY' : { lobby: 'LOBBY', countdown: 'STARTING...', live: 'ROUND LIVE', ended: 'ROUND OVER' }[r.phase];
    $('round-phase').textContent = phaseText;
    let sub = '';
    if (r.mode === 'free') sub = 'Players start whenever they like. Switch to group start for a shared round.';
    else if (r.phase === 'lobby') sub = lobby ? `${lobby} ready. Press Start when everyone has joined.` : 'Waiting for players to join.';
    else if (r.phase === 'countdown') sub = 'Countdown is showing on every phone.';
    else if (r.phase === 'live') sub = 'Everyone is playing. Standings are live on the projector.';
    else sub = r.forced ? 'You ended the round early.' : 'Scores are final. Start a new round when ready.';
    $('round-sub').textContent = sub;

    const canStart = r.mode === 'group' && r.phase === 'lobby' && lobby > 0;
    $('act-start').disabled = !canStart;
    $('act-end').disabled = !(r.phase === 'live' || r.phase === 'countdown');
    $('act-new').disabled = !(r.mode === 'group' && r.phase === 'ended');

    $('n-online').textContent = state.counts.online || 0;
    $('n-lobby').textContent = (state.counts.lobby || 0) + (state.counts.ready || 0);
    $('n-playing').textContent = state.counts.playing || 0;
    $('n-finished').textContent = state.counts.finished || 0;
    $('n-waiting').textContent = state.counts.waiting || 0;
  }

  function renderPlayers() {
    if (!state) return;
    const order = { playing: 0, ready: 1, lobby: 2, waiting: 3, finished: 4, idle: 5 };
    const list = state.players
      .filter(p => !filter || p.name.toLowerCase().includes(filter))
      .sort((a, b) => (order[a.status] - order[b.status]) || (b.score - a.score) || a.name.localeCompare(b.name));
    const sig = JSON.stringify(list);
    if (sig === lastPlayersSig) return;
    lastPlayersSig = sig;

    if (!list.length) {
      $('players-list').innerHTML = `<div class="empty-note">${filter ? 'Nobody matches.' : 'Nobody has joined yet.'}</div>`;
      return;
    }
    $('players-list').innerHTML = list.map(p => `
      <div class="player-row">
        <img class="player-av" src="/avatars/${esc(p.avatar)}.svg" alt="" width="36" height="36" loading="lazy">
        <span class="player-name">${esc(p.name)}</span>
        <span class="chip chip-${esc(p.status)}">${STATUS_LABEL[p.status] || esc(p.status)}</span>
        <span class="player-score">${p.score.toLocaleString()}</span>
        <button class="row-btn" type="button" data-act="kick" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Kick</button>
        <button class="row-btn danger" type="button" data-act="ban" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Ban</button>
      </div>`).join('');
  }

  function renderBanned() {
    const sig = JSON.stringify(state.banned);
    if (sig === lastBannedSig) return;
    lastBannedSig = sig;
    // one row per person (the server stores a device key and a name key)
    const seen = new Set();
    const rows = state.banned.filter(b => !seen.has(b.id) && seen.add(b.id));
    $('banned-list').innerHTML = rows.length
      ? rows.map(b => `<div class="player-row"><span class="player-name">${esc(b.name)}</span><button class="row-btn" type="button" data-key="${esc(b.key)}">Unban</button></div>`).join('')
      : '<div class="empty-note">No bans.</div>';
  }

  socket.on('admin_state', (data) => {
    state = data;
    renderRound();
    renderPlayers();
    renderBanned();
  });

  // live clock for countdown / round time
  setInterval(() => {
    if (!state) return;
    const r = state.round;
    const now = Date.now() + clockOffset;
    const el = $('round-clock');
    if (r.phase === 'countdown') el.textContent = `Starts in ${fmt(r.startsAt - now)}`;
    else if (r.phase === 'live') el.textContent = `${fmt(r.endsAt - now)} left`;
    else el.textContent = '';
  }, 250);
})();
