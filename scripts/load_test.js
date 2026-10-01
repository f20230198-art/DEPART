// Load tester for DEBUGGED: simulates a whole workshop (default 400 phones + 1 projector).
//
// Each bot behaves like a real player: joins (spread over a ramp window, like people scanning
// the QR code), then answers a question every few seconds using the real scoring formula,
// sends throttled progress updates, finishes at the end of the round and waits for its rank.
// A "host" client joins the projector room and receives the full leaderboard like the real host page.
//
// Usage:
//   npm run test:load                                  (400 users, full 180s round, 30s ramp)
//   USERS=350 TIME_SCALE=6 npm run test:load           (6x faster: ~30s round, same event mix per game-second)
//   TEST_URL=https://your-app.onrender.com npm run test:load
//
// TIME_SCALE only shortens waiting; it does NOT reduce load per second, so it is a *harder* test
// per second than real life. Use TIME_SCALE=1 for the realistic run.

const SERVER_URL = process.env.TEST_URL || 'http://localhost:3000';
const USERS = parseInt(process.env.USERS || '400', 10);
const GAME_SECONDS = parseInt(process.env.GAME_SECONDS || '180', 10);
const RAMP_SECONDS = parseInt(process.env.RAMP || '30', 10);
const TIME_SCALE = parseFloat(process.env.TIME_SCALE || '1');

let ioClient;
try {
  ioClient = require('socket.io-client');
} catch (e) {
  console.log('socket.io-client missing. Run: npm install --save-dev socket.io-client');
  process.exit(1);
}

const stats = {
  connected: 0,
  connectErrors: 0,
  disconnects: 0,
  joined: 0,
  progressSent: 0,
  finished: 0,
  finishConfirmed: 0,
  bytesIn: 0,
  eventsIn: 0,
  hostBytesIn: 0,
  finishLatencies: [],
  startedAt: Date.now()
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rand = (min, max) => min + Math.random() * (max - min);
const scaled = (ms) => ms / TIME_SCALE;

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

// Event-loop lag of this test harness (if high, the test machine, not the server, is the bottleneck)
let maxLag = 0;
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  maxLag = Math.max(maxLag, now - lastTick - 100);
  lastTick = now;
}, 100);

function startHost() {
  const host = ioClient(SERVER_URL, { transports: ['websocket'], reconnection: false });
  host.on('connect', () => host.emit('host_join'));
  host.onAny((event, payload) => {
    try { stats.hostBytesIn += JSON.stringify(payload || '').length; } catch (e) { /* ignore */ }
  });
  return host;
}

async function runBot(i) {
  // Spread joins across the ramp window
  await sleep(scaled(rand(0, RAMP_SECONDS * 1000)));

  const socket = ioClient(SERVER_URL, { transports: ['websocket'], reconnection: false });
  const name = `Bot_${i}`;
  const clientId = `load_${i}_${Math.random().toString(36).slice(2, 8)}`;

  socket.on('connect_error', () => { stats.connectErrors++; });
  socket.on('disconnect', () => { stats.disconnects++; });
  socket.onAny((event, payload) => {
    stats.eventsIn++;
    try { stats.bytesIn += JSON.stringify(payload || '').length; } catch (e) { /* ignore */ }
  });

  await new Promise(resolve => {
    socket.once('connect', resolve);
    socket.once('connect_error', resolve);
  });
  if (!socket.connected) return;
  stats.connected++;

  socket.emit('player_join', { name, avatar: 'peep_' + ((i % 12) + 1), clientId });
  socket.emit('player_start_game');
  stats.joined++;

  // Simulated gameplay using the same formulas as the real client
  let score = 0, combo = 1, maxCombo = 1, tier = 1, right = 0, total = 0;
  const skill = rand(0.5, 0.95); // probability of answering correctly
  const endAt = Date.now() + scaled(GAME_SECONDS * 1000);

  while (Date.now() < endAt && socket.connected) {
    await sleep(scaled(rand(2000, 6000))); // thinking time
    if (Date.now() >= endAt) break;

    total++;
    if (Math.random() < skill) {
      const base = 10 + (tier - 1) * 5;
      const speed = Math.random() < 0.3 ? 5 : 0;
      score += Math.round((base + speed) * Math.min(3, 1 + (combo - 1) * 0.1));
      combo++; right++;
      maxCombo = Math.max(maxCombo, combo);
      if (right % 3 === 0 && tier < 4) tier++;
    } else {
      score = Math.max(0, score - 5);
      combo = 1;
    }
    stats.progressSent++;
    socket.emit('player_progress', { score, combo, xp: score, comboTrigger: combo >= 5 });
  }

  if (!socket.connected) return;
  const sentAt = Date.now();
  stats.finished++;
  socket.once('finish_confirmed', () => {
    stats.finishConfirmed++;
    stats.finishLatencies.push(Date.now() - sentAt);
  });
  socket.emit('player_finish', {
    clientId, name, avatar: 'peep_' + ((i % 12) + 1),
    score, maxCombo, accuracy: total ? Math.round((right / total) * 100) : 100
  });

  await sleep(3000); // let the confirmation and a sync arrive, then leave
  socket.disconnect();
}

async function main() {
  console.log('\n======================================================');
  console.log('DEBUGGED load test');
  console.log(`Target:      ${SERVER_URL}`);
  console.log(`Players:     ${USERS} (+1 projector)`);
  console.log(`Round:       ${GAME_SECONDS}s, ramp-in ${RAMP_SECONDS}s, time scale ${TIME_SCALE}x`);
  console.log('======================================================\n');

  const host = startHost();

  const report = setInterval(() => {
    const t = Math.round((Date.now() - stats.startedAt) / 1000);
    console.log(
      `[${t}s] connected ${stats.connected}/${USERS} | errors ${stats.connectErrors} | drops ${stats.disconnects} | ` +
      `progress ${stats.progressSent} | finished ${stats.finishConfirmed}/${stats.finished} | harness lag ${maxLag}ms`
    );
  }, 5000);

  await Promise.all(Array.from({ length: USERS }, (_, i) => runBot(i + 1)));

  clearInterval(report);
  const seconds = (Date.now() - stats.startedAt) / 1000;
  const lat = stats.finishLatencies.sort((a, b) => a - b);

  console.log('\n------------------------------------------------------');
  console.log('RESULT');
  console.log(`Connected:            ${stats.connected}/${USERS}   (connect errors: ${stats.connectErrors})`);
  console.log(`Unexpected drops:     ${stats.disconnects - stats.finished}`);
  console.log(`Progress updates:     ${stats.progressSent}`);
  console.log(`Finish confirmed:     ${stats.finishConfirmed}/${stats.finished}`);
  console.log(`Finish latency (ms):  p50 ${percentile(lat, 0.5)} | p95 ${percentile(lat, 0.95)} | max ${lat[lat.length - 1] || 0}`);
  console.log(`Per-phone download:   ~${(stats.bytesIn / Math.max(stats.connected, 1) / seconds / 1024).toFixed(1)} KB/s average`);
  console.log(`Total server output:  ~${((stats.bytesIn + stats.hostBytesIn) / 1024 / 1024).toFixed(1)} MB over ${Math.round(seconds)}s (payload size, before compression)`);
  console.log(`Harness max lag:      ${maxLag}ms ${maxLag > 200 ? '(test machine was struggling; results are pessimistic)' : '(ok)'}`);
  console.log('------------------------------------------------------\n');

  host.disconnect();
  process.exit(0);
}

main();
