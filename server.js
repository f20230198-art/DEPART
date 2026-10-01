const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

let express, socketIo, QRCode;
try {
  express = require('express');
  socketIo = require('socket.io');
  QRCode = require('qrcode');
} catch (e) {
  console.log('[Notice] Some node_modules are not installed yet. Running with built-in fallbacks.');
}

const { validateUsername, OPEN_PEEPS_AVATARS } = require('./public/js/avatars');

const PORT = process.env.PORT || 3000;
const MOD_SECRET_KEY = process.env.MOD_KEY || 'gdg777';

// Scoring limits (3-minute round; a strong run is ~1,500-3,000 pts)
const MAX_SCORE = 9000;
const MAX_SCORE_JUMP_PER_TICK = 900;
const MAX_POINTS_PER_SECOND = 100;
const GAME_SECONDS = 180;
const PLAYER_LEADERBOARD_SIZE = 30; // phones only render the top 30

// Resolve local network IPv4 address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  const virtual = /virtual|vbox|vmware|vethernet|hyper-v|docker|wsl|nord|tailscale|zerotier|loopback|bluetooth/i;
  let best = null;
  let bestScore = -1;
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (iface.address.startsWith('169.254.') || iface.address.startsWith('192.168.56.')) continue;
      let score = 1;
      if (/wi-?fi|wlan|wireless/i.test(name)) score = 4;
      else if (/^(eth|en)|ethernet/i.test(name)) score = 3;
      if (virtual.test(name)) score = 0;
      if (score > bestScore) { best = iface.address; bestScore = score; }
    }
  }
  return best || 'localhost';
}

const LOCAL_IP = getLocalIp();
const BASE_URL = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || `http://${LOCAL_IP}:${PORT}`;

// In-memory runtime state store
const gameState = {
  players: new Map(),
  leaderboard: [],
  activityFeed: [],
  totalGamesPlayed: 0
};

// Group round state machine: lobby -> countdown -> live -> ended (admin drives it)
const COUNTDOWN_MS = 5000;
const END_GRACE_MS = 35000; // lets "+10 seconds" lifelines finish before the round is marked over
const round = {
  mode: 'group',          // 'group' = host starts everyone together, 'free' = each player starts on their own
  phase: 'lobby',
  registrationOpen: true,
  startsAt: 0,
  endsAt: 0,
  forced: false,          // true when the admin ended the round early
  number: 1
};
let roundTimers = [];
const banned = new Map(); // key ("id:..." or "name:...") -> { id, name }

function publicRoundState() {
  return {
    mode: round.mode,
    phase: round.phase,
    registrationOpen: round.registrationOpen,
    startsAt: round.startsAt,
    endsAt: round.endsAt,
    forced: round.forced,
    number: round.number,
    serverNow: Date.now()
  };
}

function clearRoundTimers() {
  roundTimers.forEach(clearTimeout);
  roundTimers = [];
}

// Developer Evolution Tiers
const EVOLUTION_TIERS = [
  { minXP: 0, title: 'SCRIPT KIDDIE', icon: 'terminal', level: 1 },
  { minXP: 200, title: 'STACKOVERFLOW DEV', icon: 'code', level: 2 },
  { minXP: 500, title: 'CSS SURVIVOR', icon: 'palette', level: 3 },
  { minXP: 900, title: 'FRONTEND INTERN', icon: 'zap', level: 4 },
  { minXP: 1400, title: 'FULL STACK WARRIOR', icon: 'layers', level: 5 },
  { minXP: 2000, title: '10x ENGINEER', icon: 'flame', level: 6 },
  { minXP: 2800, title: 'SYNTAX GOD', icon: 'crown', level: 7 }
];

function getTierForXP(xp) {
  let currentTier = EVOLUTION_TIERS[0];
  for (const tier of EVOLUTION_TIERS) {
    if (xp >= tier.minXP) {
      currentTier = tier;
    }
  }
  return currentTier;
}

function updateLeaderboard(player) {
  const entryId = player.id || player.socketId;
  const existingIdx = gameState.leaderboard.findIndex(p => p.id === entryId);
  const entry = {
    id: entryId,
    name: player.name,
    avatar: player.avatar || 'peep_1',
    score: player.score,
    maxCombo: player.maxCombo || 1,
    xp: player.xp || player.score,
    tier: getTierForXP(player.xp || player.score),
    accuracy: player.accuracy || 100,
    timestamp: Date.now()
  };

  if (existingIdx >= 0) {
    if (entry.score > gameState.leaderboard[existingIdx].score) {
      gameState.leaderboard[existingIdx] = entry;
    }
  } else {
    gameState.leaderboard.push(entry);
  }

  gameState.leaderboard.sort((a, b) => b.score - a.score);
  if (gameState.leaderboard.length > 500) {
    gameState.leaderboard = gameState.leaderboard.slice(0, 500);
  }
}

function addActivity(text, type = 'info') {
  const event = {
    id: Math.random().toString(36).substring(2, 9),
    text,
    type,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
  gameState.activityFeed.unshift(event);
  if (gameState.activityFeed.length > 50) {
    gameState.activityFeed.pop();
  }
  return event;
}

// While a round is running the projector shows LIVE standings: finished scores merged with in-progress scores
function buildHostBoard() {
  const byId = new Map(gameState.leaderboard.map(e => [e.id, e]));
  let anyLive = false;
  for (const p of gameState.players.values()) {
    if (p.status !== 'playing' || !(p.score > 0)) continue;
    anyLive = true;
    const existing = byId.get(p.clientId);
    if (existing && existing.score >= p.score) continue;
    byId.set(p.clientId, {
      id: p.clientId,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      maxCombo: Math.max(p.maxCombo || 1, existing ? existing.maxCombo || 1 : 1),
      xp: p.score,
      tier: getTierForXP(p.score),
      accuracy: existing ? existing.accuracy : 100,
      live: true
    });
  }
  if (!anyLive) return gameState.leaderboard;
  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, 500);
}

function countByStatus() {
  const counts = { lobby: 0, waiting: 0, playing: 0, finished: 0, idle: 0, ready: 0, online: gameState.players.size };
  for (const p of gameState.players.values()) {
    counts[p.status] = (counts[p.status] || 0) + 1;
  }
  return counts;
}

function broadcastRoundState() {
  if (io) io.emit('round_state', publicRoundState());
}

function adminSnapshot() {
  const players = [];
  for (const p of gameState.players.values()) {
    if (players.length >= 600) break;
    players.push({ id: p.clientId, name: p.name, avatar: p.avatar, status: p.status, score: p.score || 0 });
  }
  return {
    round: publicRoundState(),
    counts: countByStatus(),
    players,
    banned: [...banned.entries()].map(([key, v]) => ({ key, name: v.name, id: v.id }))
  };
}

function sendAdminState() {
  if (!io) return;
  const room = io.sockets.adapter.rooms.get('admin');
  if (room && room.size) io.to('admin').emit('admin_state', adminSnapshot());
}

function resetBoard() {
  gameState.leaderboard = [];
  gameState.activityFeed = [];
  addActivity('Leaderboard was reset by moderator', 'system');
  emitLeaderboard(true);
}

// Phones only need the top of the board; the host screen gets everything.
// Sending the full 500-row list to 400 phones on every update would be tens of MB per second.
let hostBoardTimer = null;

function pushHostBoard() {
  io.to('host').emit('leaderboard_update', {
    leaderboard: buildHostBoard(),
    activityFeed: gameState.activityFeed
  });
}

// includePlayers=false is the busy path (every finish): batch it so 400 finishes in a few seconds
// cause only a handful of board rebuilds instead of 400.
function emitLeaderboard(includePlayers = false) {
  if (!io) return;
  if (!includePlayers) {
    if (hostBoardTimer) return;
    hostBoardTimer = setTimeout(() => {
      hostBoardTimer = null;
      pushHostBoard();
    }, 800);
    return;
  }
  pushHostBoard();
  io.except('host').emit('leaderboard_update', {
    leaderboard: gameState.leaderboard.slice(0, PLAYER_LEADERBOARD_SIZE),
    activityFeed: []
  });
}

function emitToHost(event, payload) {
  if (io) io.to('host').emit(event, payload);
}

// Remove player helper with socket disconnection
function executeRemovePlayer(targetIdentifier) {
  const query = String(targetIdentifier || '').trim().toLowerCase();
  if (!query) return null;

  const idx = gameState.leaderboard.findIndex(p => 
    (p.id && p.id.toLowerCase() === query) || 
    (p.name && p.name.toLowerCase() === query)
  );

  let removedRecord = null;
  if (idx >= 0) {
    removedRecord = gameState.leaderboard.splice(idx, 1)[0];
  }

  // Disconnect active socket session if online
  if (io) {
    for (const [sId, p] of gameState.players.entries()) {
      if (sId.toLowerCase() === query ||
          (p.clientId && p.clientId.toLowerCase() === query) ||
          (p.name && p.name.toLowerCase() === query)) {
        gameState.players.delete(sId);
        const sock = io.sockets.sockets.get(sId);
        if (sock) {
          sock.emit('player_kicked', { message: 'Your session was removed by a workshop moderator.' });
          sock.disconnect(true);
        }
      }
    }

    const name = (removedRecord && removedRecord.name) || targetIdentifier;
    const event = addActivity(`${name} was removed by moderator`, 'system');
    emitLeaderboard(true);
    emitToHost('activity_event', event);
    emitToHost('player_count_update', { count: gameState.players.size });
  }

  return removedRecord || { name: targetIdentifier };
}

let server;
let app;

if (express) {
  app = express();
  server = http.createServer(app);

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // REST endpoints for server info and dynamic QR code generation
  app.get(['/api/info', '/api/server-info'], async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const hostHeader = req.headers.host;
    // A projector opened as http://localhost:3000/host must still show a link phones can reach
    const hostIsLocal = !hostHeader || /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(hostHeader);
    const dynamicUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || (hostIsLocal ? BASE_URL : `${protocol}://${hostHeader}`);

    let qrDataUrl = '';
    if (QRCode) {
      try {
        qrDataUrl = await QRCode.toDataURL(dynamicUrl, { margin: 1, width: 260 });
      } catch (err) {
        console.error('QR generation failed:', err);
      }
    }
    res.json({
      localIp: LOCAL_IP,
      port: PORT,
      url: dynamicUrl,
      qrCode: qrDataUrl,
      playerCount: gameState.players.size,
      totalGamesPlayed: gameState.totalGamesPlayed
    });
  });

  app.get('/api/leaderboard', (req, res) => {
    res.json({
      leaderboard: gameState.leaderboard,
      activityFeed: gameState.activityFeed
    });
  });

  // Moderator endpoint to remove/kick player with secret PIN validation
  app.post('/api/admin/remove-player', (req, res) => {
    const { target, modKey } = req.body || {};
    if (modKey !== MOD_SECRET_KEY) {
      return res.status(403).json({ error: 'Unauthorized: Invalid Moderator PIN.' });
    }

    const removed = executeRemovePlayer(target);
    if (!removed) {
      return res.status(404).json({ error: 'Player not found on leaderboard or active sessions.' });
    }

    res.json({ success: true, removed });
  });

  app.post('/api/reset-leaderboard', (req, res) => {
    const { modKey } = req.body || {};
    if (!modKey || String(modKey).trim() !== MOD_SECRET_KEY) {
      return res.status(403).json({ error: 'Unauthorized: Valid Moderator PIN is required to reset the leaderboard.' });
    }

    resetBoard();
    res.json({ success: true });
  });

  app.get('/host', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'host.html'));
  });

  app.get('/play', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Lightweight health check for the hosting platform (no QR generation)
  app.get('/healthz', (req, res) => res.type('text').send('ok'));

  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });
} else {
  server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    if (req.url === '/host') filePath = path.join(__dirname, 'public', 'host.html');
    if (req.url === '/play') filePath = path.join(__dirname, 'public', 'index.html');
    if (req.url === '/admin') filePath = path.join(__dirname, 'public', 'admin.html');

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.svg': 'image/svg+xml'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(data);
    });
  });
}

// WebSocket real-time synchronization with connection rate limiting
let io;
if (socketIo) {
  io = socketIo(server, {
    cors: { origin: '*' },
    perMessageDeflate: false, // compression costs CPU and the messages are tiny
    pingInterval: 25000,
    pingTimeout: 30000
  });

  io.on('connection', (socket) => {
    socket.lastProgressTick = 0;
    socket.emit('round_state', publicRoundState());

    // The projector screen joins a room so it alone receives the full leaderboard and live feed
    socket.on('host_join', () => {
      socket.join('host');
      socket.emit('leaderboard_update', {
        leaderboard: buildHostBoard(),
        activityFeed: gameState.activityFeed
      });
      socket.emit('player_count_update', { count: gameState.players.size });
      socket.emit('round_state', publicRoundState());
    });

    // Handle player join
    socket.on('player_join', (data) => {
      data = data || {};
      const rawName = data.name ? String(data.name) : '';
      const validation = validateUsername(rawName);
      const cleanName = validation.valid ? validation.cleanUsername : 'Coder_' + socket.id.substring(0, 4);

      const clientId = (typeof data.clientId === 'string' && /^[\w-]{4,40}$/.test(data.clientId))
        ? data.clientId
        : socket.id;

      // Moderation: banned devices/names, and closed registration (returning players are still let back in)
      if (banned.has(`id:${clientId}`) || banned.has(`name:${cleanName.toLowerCase()}`)) {
        socket.emit('join_rejected', { reason: 'banned', message: 'You cannot join with this name. Please see a volunteer.' });
        return;
      }
      const known = gameState.leaderboard.some(e => e.id === clientId) ||
        [...gameState.players.values()].some(pl => pl.clientId === clientId);
      if (!round.registrationOpen && !known) {
        socket.emit('join_rejected', { reason: 'closed', message: 'Joining is closed right now. Please see a volunteer.' });
        return;
      }

      let status = 'idle';
      if (round.mode === 'group') status = round.phase === 'lobby' ? 'lobby' : 'waiting';

      const player = {
        socketId: socket.id,
        clientId,
        status,
        name: cleanName,
        avatar: data.avatar ? String(data.avatar).slice(0, 20) : 'peep_1',
        score: 0,
        combo: 1,
        maxCombo: 1,
        xp: 0,
        tier: EVOLUTION_TIERS[0],
        joinedAt: Date.now(),
        gameStartedAt: 0
      };

      gameState.players.set(socket.id, player);
      const event = addActivity(`${player.name} joined the arena`, 'join');

      socket.emit('player_init', {
        player,
        serverInfo: { url: BASE_URL, localIp: LOCAL_IP },
        leaderboard: gameState.leaderboard.slice(0, PLAYER_LEADERBOARD_SIZE),
        activityFeed: [],
        status,
        round: publicRoundState()
      });
      sendAdminState();

      emitToHost('player_count_update', { count: gameState.players.size });
      emitToHost('activity_event', event);
    });

    socket.on('player_start_game', () => {
      const player = gameState.players.get(socket.id);
      if (player) {
        player.gameStartedAt = Date.now();
        player.status = 'playing';
        player.score = 0;
        player.combo = 1;
      }
    });

    // Group mode: after a round, a player taps "play again" to wait for the next one
    socket.on('player_ready', () => {
      const player = gameState.players.get(socket.id);
      if (!player) return;
      player.score = 0;
      player.combo = 1;
      player.status = (round.mode === 'group' && round.phase === 'lobby') ? 'lobby' : (round.mode === 'free' ? 'idle' : 'waiting');
      socket.emit('ready_ack', { status: player.status, round: publicRoundState() });
      sendAdminState();
    });

    // Throttled real-time score progression (protects CPU from flood)
    socket.on('player_progress', (data) => {
      data = data || {};
      const now = Date.now();
      if (now - socket.lastProgressTick < 250) return; // Drop spamming sub-250ms ticks
      socket.lastProgressTick = now;

      const player = gameState.players.get(socket.id);
      if (!player) return;
      if (player.status !== 'playing') player.status = 'playing';

      let rawScore = Number(data.score) || 0;
      
      // Anti-Cheat: Reject impossible burst score jumps
      const currentScore = player.score || 0;
      if (rawScore > currentScore + MAX_SCORE_JUMP_PER_TICK) {
        rawScore = currentScore + MAX_SCORE_JUMP_PER_TICK;
      }

      player.score = Math.min(Math.max(0, rawScore), MAX_SCORE);
      player.combo = Math.min(Math.max(1, Number(data.combo) || 1), 10);
      player.maxCombo = Math.max(player.maxCombo, player.combo);
      player.xp = player.score;
      const prevTier = player.tier;
      player.tier = getTierForXP(player.xp);

      if (data.comboTrigger && player.combo >= 5) {
        const event = addActivity(`${player.name} reached a ${player.combo}x combo streak!`, 'combo');
        emitToHost('activity_event', event);
      }

      if (player.tier.level > prevTier.level) {
        const event = addActivity(`${player.name} evolved to ${player.tier.title}!`, 'levelup');
        emitToHost('activity_event', event);
      }
    });

    // Player completion event with server-side time and score verification
    socket.on('player_finish', (data) => {
      data = data || {};
      const player = gameState.players.get(socket.id);
      gameState.totalGamesPlayed++;
      if (player) player.status = 'finished';

      const rawScore = Number(data.score) || 0;
      
      // Anti-Cheat: Verify elapsed time so instant finish scripts cannot award full scores
      const elapsedSeconds = player && player.gameStartedAt
        ? Math.min(GAME_SECONDS + 60, (Date.now() - player.gameStartedAt) / 1000)
        : GAME_SECONDS;
      const theoreticalMax = Math.min(MAX_SCORE, Math.round(Math.max(1, elapsedSeconds) * MAX_POINTS_PER_SECOND) + 300);
      const cleanScore = Math.min(Math.max(0, rawScore), theoreticalMax);
      const cleanMaxCombo = Math.min(Math.max(1, Number(data.maxCombo) || 1), 10);

      const rawName = (player ? player.name : (data && data.name) ? String(data.name) : 'Anonymous');
      const validation = validateUsername(rawName);
      const cleanName = validation.valid ? validation.cleanUsername.substring(0, 16) : 'Anonymous';

      const finalRecord = {
        id: player ? player.clientId : socket.id,
        name: cleanName,
        avatar: (player ? player.avatar : String(data.avatar || 'peep_1').slice(0, 20)),
        score: cleanScore,
        maxCombo: cleanMaxCombo,
        xp: cleanScore,
        accuracy: Math.min(100, Math.max(0, Number(data.accuracy) || 100))
      };

      updateLeaderboard(finalRecord);

      const rank = gameState.leaderboard.findIndex(p => p.id === finalRecord.id) + 1;
      const totalPlayers = Math.max(gameState.leaderboard.length, 1);
      const percentile = Math.max(1, Math.round((rank / totalPlayers) * 100));

      const event = addActivity(`${finalRecord.name} finished with ${finalRecord.score.toLocaleString()} PTS (Rank #${rank})`, 'finish');

      socket.emit('finish_confirmed', {
        rank,
        percentile,
        totalScores: gameState.leaderboard.length,
        leaderboard: gameState.leaderboard.slice(0, PLAYER_LEADERBOARD_SIZE)
      });

      // Phones get the periodic sync; only the projector needs an instant push
      emitLeaderboard(false);
      emitToHost('activity_event', event);
    });

    // Moderator Action via WebSocket with secret PIN validation
    socket.on('host_kick_player', (data) => {
      const { target, modKey } = data || {};
      if (modKey !== MOD_SECRET_KEY) {
        socket.emit('mod_feedback', { success: false, message: 'Invalid Moderator PIN.' });
        return;
      }

      const removed = executeRemovePlayer(target);
      if (removed) {
        socket.emit('mod_feedback', { success: true, message: `Removed ${removed.name || target} from leaderboard.` });
      } else {
        socket.emit('mod_feedback', { success: false, message: `Player "${target}" not found.` });
      }
    });

    // Host simulated player generator (Protected by Moderator PIN)
    socket.on('host_spawn_bots', (data) => {
      const modKey = (typeof data === 'object' && data) ? data.modKey : null;
      const count = (typeof data === 'object' && data && data.count) ? data.count : 15;

      if (!modKey || String(modKey).trim() !== MOD_SECRET_KEY) {
        socket.emit('mod_feedback', { success: false, message: 'Unauthorized: Valid Moderator PIN required to spawn bots.' });
        return;
      }

      const botNames = [
        'Aarav', 'Sara', 'Dev', 'Meera', 'Rohan', 'Ananya', 'Kabir', 'Tanvi',
        'Zain', 'Priya', 'Aditya', 'Riya', 'Vikram', 'Neha', 'Arjun', 'Isha',
        'Karan', 'Sneha', 'Rahul', 'Pooja', 'Nikhil', 'Divya', 'Siddharth', 'Tara'
      ];
      
      const peepIds = OPEN_PEEPS_AVATARS.map(p => p.id);

      for (let i = 0; i < count; i++) {
        const name = botNames[Math.floor(Math.random() * botNames.length)] + '_' + Math.floor(Math.random() * 90 + 10);
        const avatar = peepIds[Math.floor(Math.random() * peepIds.length)];
        const score = Math.floor(Math.random() * 5800 + 1200);
        const maxCombo = Math.floor(Math.random() * 8 + 2);
        const xp = score + Math.floor(Math.random() * 400);

        const bot = {
          id: 'bot_' + Math.random().toString(36).substring(2, 8),
          name,
          avatar,
          score,
          maxCombo,
          xp,
          accuracy: Math.floor(Math.random() * 25 + 75),
          isBot: true
        };

        updateLeaderboard(bot);
      }

      addActivity(`Added ${count} simulated workshop participants`, 'system');

      emitLeaderboard(true);
    });

    // ------------------------------------------------------------ admin panel (PIN checked on every action)
    const adminOk = (data) => socket.isAdmin === true && data && String(data.modKey || '').trim() === MOD_SECRET_KEY;
    const feedback = (ok, message) => socket.emit('admin_feedback', { ok, message });

    socket.on('admin_join', (data) => {
      if (!data || String(data.modKey || '').trim() !== MOD_SECRET_KEY) {
        socket.emit('admin_denied', { message: 'Wrong PIN.' });
        return;
      }
      socket.isAdmin = true;
      socket.join('admin');
      socket.emit('admin_ok');
      socket.emit('admin_state', adminSnapshot());
    });

    socket.on('admin_set_mode', (data) => {
      if (!adminOk(data)) return feedback(false, 'Not authorised.');
      if (!['group', 'free'].includes(data.mode)) return feedback(false, 'Unknown mode.');
      if (round.phase === 'countdown' || round.phase === 'live') return feedback(false, 'End the round before changing the mode.');
      clearRoundTimers();
      round.mode = data.mode;
      round.phase = 'lobby';
      round.startsAt = 0;
      round.endsAt = 0;
      round.forced = false;
      for (const pl of gameState.players.values()) pl.status = round.mode === 'group' ? 'lobby' : 'idle';
      broadcastRoundState();
      sendAdminState();
      feedback(true, round.mode === 'group' ? 'Group start on: players wait in the lobby.' : 'Free play on: players start on their own.');
    });

    socket.on('admin_registration', (data) => {
      if (!adminOk(data)) return feedback(false, 'Not authorised.');
      round.registrationOpen = !!data.open;
      broadcastRoundState();
      sendAdminState();
      feedback(true, round.registrationOpen ? 'Joining is open.' : 'Joining is closed for new players.');
    });

    socket.on('admin_start', (data) => {
      if (!adminOk(data)) return feedback(false, 'Not authorised.');
      if (round.mode !== 'group') return feedback(false, 'Switch to group start first.');
      if (round.phase !== 'lobby') return feedback(false, 'A round is already running. End it or start a new round.');
      const ready = [...gameState.players.values()].filter(pl => pl.status === 'lobby');
      if (!ready.length) return feedback(false, 'Nobody is in the lobby yet.');

      clearRoundTimers();
      round.phase = 'countdown';
      round.forced = false;
      round.startsAt = Date.now() + COUNTDOWN_MS;
      round.endsAt = round.startsAt + GAME_SECONDS * 1000;
      ready.forEach(pl => { pl.status = 'ready'; pl.score = 0; pl.combo = 1; });
      broadcastRoundState();
      addActivity(`Round ${round.number} starting with ${ready.length} players!`, 'system');
      emitToHost('activity_event', gameState.activityFeed[0]);

      roundTimers.push(setTimeout(() => {
        round.phase = 'live';
        for (const pl of gameState.players.values()) {
          if (pl.status === 'ready') { pl.status = 'playing'; pl.gameStartedAt = round.startsAt; }
        }
        broadcastRoundState();
        sendAdminState();
      }, COUNTDOWN_MS));

      roundTimers.push(setTimeout(() => {
        if (round.phase === 'live') {
          round.phase = 'ended';
          broadcastRoundState();
          emitLeaderboard(true);
          sendAdminState();
        }
      }, COUNTDOWN_MS + GAME_SECONDS * 1000 + END_GRACE_MS));

      sendAdminState();
      feedback(true, `Starting round ${round.number} for ${ready.length} players.`);
    });

    socket.on('admin_end', (data) => {
      if (!adminOk(data)) return feedback(false, 'Not authorised.');
      if (round.phase !== 'live' && round.phase !== 'countdown') return feedback(false, 'No round is running.');
      clearRoundTimers();
      round.phase = 'ended';
      round.forced = true;
      broadcastRoundState();
      emitLeaderboard(true);
      sendAdminState();
      feedback(true, 'Round ended.');
    });

    socket.on('admin_new_round', (data) => {
      if (!adminOk(data)) return feedback(false, 'Not authorised.');
      if (round.phase === 'countdown' || round.phase === 'live') return feedback(false, 'End the current round first.');
      clearRoundTimers();
      round.phase = 'lobby';
      round.startsAt = 0;
      round.endsAt = 0;
      round.forced = false;
      round.number++;
      for (const pl of gameState.players.values()) {
        if (pl.status === 'waiting') pl.status = 'lobby';
      }
      broadcastRoundState();
      sendAdminState();
      feedback(true, `Round ${round.number} lobby is open.`);
    });

    socket.on('admin_reset_board', (data) => {
      if (!adminOk(data)) return feedback(false, 'Not authorised.');
      resetBoard();
      sendAdminState();
      feedback(true, 'Leaderboard cleared.');
    });

    socket.on('admin_kick', (data) => {
      if (!adminOk(data) || !data.id) return feedback(false, 'Not authorised.');
      executeRemovePlayer(String(data.id));
      sendAdminState();
      feedback(true, 'Player removed.');
    });

    socket.on('admin_ban', (data) => {
      if (!adminOk(data) || !data.id) return feedback(false, 'Not authorised.');
      const target = [...gameState.players.values()].find(pl => pl.clientId === String(data.id));
      const name = target ? target.name : String(data.name || data.id);
      banned.set(`id:${data.id}`, { id: String(data.id), name });
      banned.set(`name:${name.toLowerCase()}`, { id: String(data.id), name });
      executeRemovePlayer(String(data.id));
      sendAdminState();
      feedback(true, `${name} is banned.`);
    });

    socket.on('admin_unban', (data) => {
      if (!adminOk(data) || !data.key) return feedback(false, 'Not authorised.');
      const entry = banned.get(String(data.key));
      if (entry) {
        for (const [k, v] of [...banned.entries()]) {
          if (v.id === entry.id) banned.delete(k);
        }
      }
      sendAdminState();
      feedback(true, 'Ban lifted.');
    });

    socket.on('disconnect', () => {
      gameState.players.delete(socket.id);
      emitToHost('player_count_update', { count: gameState.players.size });
      sendAdminState();
    });
  });

  // Periodic synchronization. Only sends when something actually changed, which keeps CPU and bandwidth
  // low on small hosts (a free tier gets about a tenth of a CPU core).
  let lastHostSig = '';
  let lastPlayerSig = '';
  setInterval(() => {
    const meta = {
      playerCount: gameState.players.size,
      lobbyCount: countByStatus().lobby,
      totalGamesPlayed: gameState.totalGamesPlayed
    };

    const hostPayload = {
      ...meta,
      leaderboard: buildHostBoard(),
      activityFeed: gameState.activityFeed.slice(0, 30)
    };
    const hostSig = JSON.stringify(hostPayload);
    if (hostSig !== lastHostSig) {
      lastHostSig = hostSig;
      io.to('host').emit('leaderboard_sync', hostPayload);
    }

    const playerPayload = {
      ...meta,
      leaderboard: gameState.leaderboard.slice(0, PLAYER_LEADERBOARD_SIZE)
    };
    const playerSig = JSON.stringify(playerPayload);
    if (playerSig !== lastPlayerSig) {
      lastPlayerSig = playerSig;
      io.except('host').emit('leaderboard_sync', playerPayload);
    }

    sendAdminState();
  }, 3000);
}

// Start HTTP Server
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n------------------------------------------------------');
  console.log('DEBUGGED - Realtime Server Active');
  console.log('------------------------------------------------------');
  console.log(`Host Screen URL:      http://localhost:${PORT}/host`);
  console.log(`Mobile Player URL:    ${BASE_URL}`);
  console.log(`Local Player URL:     http://localhost:${PORT}`);
  console.log('------------------------------------------------------\n');
});
