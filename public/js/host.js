// Projector TV / Host Controller
let socket = null;
if (typeof io !== 'undefined') {
  socket = io({ transports: ['websocket', 'polling'] });
}

const hostState = {
  playerCount: 0,
  leaderboard: [],
  activityFeed: [],
  topPlayerId: null,
  filterQuery: ''
};

// Dynamic DOM Getters (Prevents null reference bugs)
const el = {
  get qrImg() { return document.getElementById('host-qr-img'); },
  get joinUrl() { return document.getElementById('host-join-url'); },
  get playerCount() { return document.getElementById('host-player-count'); },
  get leaderboardList() { return document.getElementById('host-leaderboard-list'); },
  get activityList() { return document.getElementById('host-activity-list'); },
  get soundToggleBtn() { return document.getElementById('btn-sound-toggle-host'); },
  get soundIcon() { return document.getElementById('sound-icon-host'); },
  get spawnBotsBtn() { return document.getElementById('btn-spawn-bots'); },
  get resetBoardBtn() { return document.getElementById('btn-reset-board'); },
  get themeToggleBtn() { return document.getElementById('btn-theme-toggle-host'); },
  get themeIcon() { return document.getElementById('theme-icon-host'); },
  get countBadge() { return document.getElementById('lb-count-badge'); },
  get searchInput() { return document.getElementById('host-lb-search'); }
};

// Theme UI Update
function updateThemeUI() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  if (el.themeIcon && window.getIconHTML) {
    el.themeIcon.innerHTML = window.getIconHTML(current === 'dark' ? 'sun' : 'moon', 16);
  }
}

// Sound UI Update
function updateSoundUI() {
  if (!window.soundEngine) return;
  const isMuted = window.soundEngine.muted;
  if (el.soundIcon && window.getIconHTML) {
    el.soundIcon.innerHTML = window.getIconHTML(isMuted ? 'volume-x' : 'volume-2', 16);
  }
}

// Fetch server info (IP, QR Code, existing leaderboard & activity feed)
async function fetchServerInfo() {
  try {
    const res = await fetch('/api/info');
    const data = await res.json();

    if (data.qrCode && el.qrImg) {
      el.qrImg.src = data.qrCode;
    }
    if (data.url && el.joinUrl) {
      el.joinUrl.textContent = data.url;
    }
    if (el.playerCount) {
      el.playerCount.textContent = data.playerCount || 0;
    }

    const lbRes = await fetch('/api/leaderboard');
    const lbData = await lbRes.json();
    if (lbData.leaderboard) {
      renderLeaderboard(lbData.leaderboard);
    }
    if (lbData.activityFeed && Array.isArray(lbData.activityFeed)) {
      renderActivityFeed(lbData.activityFeed);
    }
  } catch (err) {
    console.warn('Server info fetch fallback:', err);
    if (el.joinUrl) el.joinUrl.textContent = window.location.origin;
  }
}

// Render Leaderboard
function renderLeaderboard(list) {
  if (!el.leaderboardList) return;
  hostState.leaderboard = list || [];

  // The server re-sends the board every 2s; only redraw when something actually changed
  const sig = JSON.stringify(hostState.leaderboard) + '|' + (hostState.filterQuery || '');
  if (sig === hostState.lbSig) return;
  hostState.lbSig = sig;

  const totalCount = hostState.leaderboard.length;
  if (el.countBadge) {
    el.countBadge.textContent = `${totalCount} Player${totalCount === 1 ? '' : 's'}`;
  }

  if (!list || list.length === 0) {
    el.leaderboardList.innerHTML = `
      <div class="lb-empty">${emptyBoardText()}</div>
    `;
    return;
  }

  // Check if there is a new #1 leader to celebrate
  if (list.length > 0) {
    const newTop = list[0];
    if (newTop && newTop.id !== hostState.topPlayerId) {
      if (hostState.topPlayerId !== null) {
        if (window.soundEngine) window.soundEngine.playLevelUp();
        if (window.confetti) window.confetti.fire({ count: 100, upward: true });
        addActivityFeedItem({
          text: `${newTop.name} took the #1 spot on the leaderboard!`,
          type: 'finish',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
      hostState.topPlayerId = newTop.id;
    }
  }

  // Filter list if search query exists
  const query = hostState.filterQuery || '';
  const filtered = query 
    ? list.filter((p, idx) => p.name.toLowerCase().includes(query) || String(idx + 1) === query)
    : list;

  el.leaderboardList.innerHTML = '';

  if (filtered.length === 0) {
    el.leaderboardList.innerHTML = `
      <div class="lb-empty">Nobody matches "${query}"</div>
    `;
    return;
  }

  // Render all players in the list
  filtered.forEach((entry) => {
    const actualRank = list.findIndex(p => p.name === entry.name && p.score === entry.score) + 1;
    const rank = actualRank > 0 ? actualRank : 1;
    const row = document.createElement('div');
    row.className = `lb-row rank-${rank <= 3 ? rank : 'other'}`;

    let avatarMarkup = '';
    if (entry.avatar && (entry.avatar.startsWith('peep_') || entry.avatar.includes('_'))) {
      avatarMarkup = window.renderAvatarHTML ? window.renderAvatarHTML(entry.avatar, 42) : `<div class="peep-avatar-frame" style="width:42px;height:42px;"></div>`;
    } else {
      const avatarSvg = window.getIconHTML ? window.getIconHTML(entry.avatar || 'terminal', 18) : '';
      avatarMarkup = `<div class="lb-avatar-icon" style="width:30px;height:30px;border-radius:50%;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;color:var(--indigo);">${avatarSvg}</div>`;
    }

    const tierIconKey = (entry.tier && entry.tier.icon) ? entry.tier.icon : 'terminal';
    const tierIcon = window.getIconHTML ? window.getIconHTML(tierIconKey, 13) : '';
    const flameIcon = window.getIconHTML ? window.getIconHTML('flame', 13) : '';

    row.innerHTML = `
      <div class="lb-left">
        <div class="lb-rank-badge">#${rank}</div>
        ${avatarMarkup}
        <div class="lb-user-details">
          <span class="lb-name" title="${entry.name}">${entry.name}</span>
          <span class="lb-tier-tag">
            ${tierIcon}
            <span>${(entry.tier && entry.tier.title) || 'DEVELOPER'}</span>
          </span>
        </div>
      </div>
      <div class="lb-right">
        <div class="lb-streak-tag">
          ${flameIcon}
          <span>${entry.maxCombo || 1}x</span>
        </div>
        <div class="lb-score-box">
          <span class="lb-score-val">${(entry.score || 0).toLocaleString()}</span>
          <span class="lb-score-unit">PTS</span>
        </div>
        <button class="lb-remove-btn" title="Remove Player" data-id="${entry.id || ''}" data-name="${entry.name}">
          ${window.getIconHTML ? window.getIconHTML('trash-2', 12) : '✕'}
        </button>
      </div>
    `;

    el.leaderboardList.appendChild(row);
  });

  if (window.refreshIcons) window.refreshIcons();
}

// Helper to retrieve or prompt for Moderator PIN
function getOrPromptModKey(promptMsg = 'Enter Moderator PIN:') {
  let pin = sessionStorage.getItem('debugged_mod_pin');
  if (!pin) {
    pin = prompt(promptMsg);
    if (pin) {
      pin = pin.trim();
      sessionStorage.setItem('debugged_mod_pin', pin);
    }
  }
  return pin || null;
}

// Render full Activity Feed list
function renderActivityFeed(feed) {
  if (!el.activityList || !Array.isArray(feed)) return;
  if (feed.length === 0) return;

  const feedSig = JSON.stringify(feed.slice(0, 20));
  if (feedSig === hostState.feedSig) return;
  hostState.feedSig = feedSig;

  el.activityList.innerHTML = '';
  feed.slice(0, 20).forEach(event => {
    const item = document.createElement('div');
    item.className = `activity-item ${event.type || 'info'}`;
    item.innerHTML = `
      <span class="activity-time">${event.time || 'Just now'}</span>
      <span>${event.text}</span>
    `;
    el.activityList.appendChild(item);
  });
}

// Add Item to Activity Feed dynamically
function addActivityFeedItem(event) {
  if (!event || !event.text || !el.activityList) return;

  const item = document.createElement('div');
  item.className = `activity-item ${event.type || 'info'}`;
  item.innerHTML = `
    <span class="activity-time">${event.time || 'Just now'}</span>
    <span>${event.text}</span>
  `;

  el.activityList.insertBefore(item, el.activityList.firstChild);

  while (el.activityList.children.length > 25) {
    el.activityList.removeChild(el.activityList.lastChild);
  }
}

// ---- Group round display: pill, big countdown, live standings title
let hostRound = null;
let hostClockOffset = 0;
let hostLobbyCount = 0;
let hostLastCount = null;

function fmtClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function emptyBoardText() {
  if (hostRound && hostRound.mode === 'group' && hostRound.phase === 'lobby') return 'The round starts when the host presses Start.';
  if (hostRound && hostRound.phase === 'live') return 'Scores will appear as people answer...';
  return 'Waiting for the first scores...';
}

function renderRoundPill() {
  const pill = document.getElementById('round-pill-text');
  const title = document.getElementById('lb-title-text');
  if (!pill || !hostRound) return;
  const r = hostRound;
  const now = Date.now() + hostClockOffset;
  let text;
  if (r.mode === 'free') text = 'FREE PLAY';
  else if (r.phase === 'lobby') text = `LOBBY \u00b7 ${hostLobbyCount} READY`;
  else if (r.phase === 'countdown') text = 'STARTING...';
  else if (r.phase === 'live') text = `ROUND LIVE \u00b7 ${fmtClock(r.endsAt - now)}`;
  else text = 'ROUND OVER';
  pill.textContent = text;
  if (title) title.textContent = (r.phase === 'live' || r.phase === 'countdown') && r.mode === 'group' ? 'LIVE STANDINGS' : 'LEADERBOARD';
}

setInterval(() => {
  if (!hostRound) return;
  renderRoundPill();
  const overlay = document.getElementById('host-countdown');
  const num = document.getElementById('host-countdown-num');
  if (!overlay || !num) return;
  const now = Date.now() + hostClockOffset;
  const r = hostRound;
  let show = null;
  if (r.mode === 'group' && r.phase === 'countdown') {
    const secs = Math.ceil((r.startsAt - now) / 1000);
    show = secs > 0 ? String(secs) : 'GO!';
  } else if (r.mode === 'group' && r.phase === 'live' && now - r.startsAt < 900) {
    show = 'GO!';
  }
  if (show === null) {
    overlay.hidden = true;
    hostLastCount = null;
    return;
  }
  overlay.hidden = false;
  if (show !== hostLastCount) {
    hostLastCount = show;
    num.textContent = show;
    num.classList.remove('pop');
    void num.offsetWidth;
    num.classList.add('pop');
    if (window.soundEngine) {
      if (show === 'GO!') window.soundEngine.playBossAlarm();
      else window.soundEngine.playTimerTick(Number(show) <= 3);
    }
  }
}, 150);

// Socket.IO Event Listeners
if (socket) {
  socket.on('connect', () => {
    console.log('Projector connected to game server');
    socket.emit('host_join');
  });

  socket.on('player_count_update', (data) => {
    if (el.playerCount) el.playerCount.textContent = data.count || 0;
  });

  socket.on('leaderboard_update', (data) => {
    if (data.leaderboard) renderLeaderboard(data.leaderboard);
    if (data.activityFeed) renderActivityFeed(data.activityFeed);
  });

  socket.on('round_state', (info) => {
    hostRound = info;
    hostClockOffset = info.serverNow - Date.now();
    renderRoundPill();
  });

  socket.on('leaderboard_sync', (data) => {
    if (typeof data.lobbyCount === 'number') { hostLobbyCount = data.lobbyCount; renderRoundPill(); }
    if (data.leaderboard) renderLeaderboard(data.leaderboard);
    if (data.activityFeed) renderActivityFeed(data.activityFeed);
    if (el.playerCount) el.playerCount.textContent = data.playerCount || 0;
  });

  socket.on('activity_event', (event) => {
    addActivityFeedItem(event);
  });

  socket.on('mod_feedback', (res) => {
    if (!res.success) {
      sessionStorage.removeItem('debugged_mod_pin');
      alert(res.message || 'Unauthorized action.');
    }
  });
}

function initHostListeners() {
  updateThemeUI();
  updateSoundUI();

  if (el.themeToggleBtn) {
    el.themeToggleBtn.addEventListener('click', () => {
      if (window.toggleTheme) window.toggleTheme();
      updateThemeUI();
      if (window.soundEngine) window.soundEngine.playClick();
    });
  }

  if (el.soundToggleBtn) {
    el.soundToggleBtn.addEventListener('click', () => {
      if (window.soundEngine) window.soundEngine.toggleMute();
      updateSoundUI();
    });
  }

  if (el.searchInput) {
    el.searchInput.addEventListener('input', (e) => {
      hostState.filterQuery = (e.target.value || '').trim().toLowerCase();
      renderLeaderboard(hostState.leaderboard);
    });
  }

  // Moderator remove button listener on host screen
  if (el.leaderboardList) {
    el.leaderboardList.addEventListener('click', (e) => {
      const btn = e.target.closest('.lb-remove-btn');
      if (!btn) return;
      const targetId = btn.dataset.id;
      const targetName = btn.dataset.name;

      const modKey = getOrPromptModKey(`Enter Moderator PIN to remove "${targetName}":`);
      if (!modKey) return;

      if (confirm(`Remove "${targetName}" from the leaderboard?`)) {
        if (socket && socket.connected) {
          socket.emit('host_kick_player', { target: targetId || targetName, modKey });
        }
      }
    });
  }

  // Host Controls (Protected by Moderator PIN)
  if (el.spawnBotsBtn) {
    el.spawnBotsBtn.addEventListener('click', () => {
      const modKey = getOrPromptModKey('Enter Moderator PIN to spawn demo bots:');
      if (!modKey) return;

      if (window.soundEngine) window.soundEngine.playClick();
      if (socket && socket.connected) {
        socket.emit('host_spawn_bots', { count: 15, modKey });
      }
    });
  }

  if (el.resetBoardBtn) {
    el.resetBoardBtn.addEventListener('click', async () => {
      const modKey = getOrPromptModKey('Enter Moderator PIN to reset all scores:');
      if (!modKey) return;

      if (confirm('Are you sure you want to permanently clear all scores and activity?')) {
        if (window.soundEngine) window.soundEngine.playClick();
        try {
          const res = await fetch('/api/reset-leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modKey })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            renderLeaderboard([]);
            if (el.activityList) el.activityList.innerHTML = '<div class="activity-item"><span class="activity-time">--:--</span><span>Leaderboard reset by moderator.</span></div>';
          } else {
            sessionStorage.removeItem('debugged_mod_pin');
            alert(data.error || 'Invalid Moderator PIN. Reset aborted.');
          }
        } catch (e) {
          alert('Network error while resetting leaderboard.');
        }
      }
    });
  }

  fetchServerInfo();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHostListeners);
} else {
  initHostListeners();
}
