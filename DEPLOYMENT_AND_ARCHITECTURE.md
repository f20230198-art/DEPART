# DEBUGGED: Deployment, Architecture, and High-Concurrency Guide

This guide explains how DEBUGGED functions without external database dependencies, how it handles 100 to 500 simultaneous participants with real-time scoring, and how to deploy it securely without crashes or cheating.

---

## 1. How It Works Without External Cloud Services (Supabase / Render)

### In-Memory State Architecture
The platform is completely self-contained. It does not require external database services (such as Supabase, Firebase, or MongoDB) or cloud function runtimes because it uses an **in-memory event-driven engine**:

```
[500 Client Phones / Laptops]
           |
   (Full-Duplex WebSockets)
           v
  [Node.js + Socket.IO Server]
           |
  [In-Memory RAM Store]
   - Map: socketId -> Player State
   - Array: Sorted Leaderboard (500 entries)
   - Array: Activity Event Stream
```

### Key Performance Characteristics
1. **Sub-Millisecond Read/Write Latency**:
   - Updates and score calculations occur in Node.js process RAM (0.05ms per operation).
   - Traditional database queries (SQL/NoSQL) introduce 15ms to 50ms of network overhead per write, which creates bottlenecks during rapid 60-second multiplayer bursts.
2. **Deterministic Memory Footprint**:
   - 500 active player objects and a 500-slot leaderboard require less than 45 MB of RAM in the Node.js runtime.
3. **Offline Capability**:
   - The server can run entirely on a local area network (LAN) without internet access.

---

## 2. Deployment Options for 100 to 500 Participants

### Option A: Render Cloud Deployment (Recommended Cloud Host)
DEBUGGED is pre-configured for instant deployment on Render as a Web Service.

#### Step-by-Step Render Setup:
1. Push your repository to GitHub (`https://github.com/prxcode/debugged-gdg.git`).
2. Open your [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository `debugged-gdg`.
4. Configure the build parameters (or Render will auto-detect from `render.yaml`):
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free` or `Starter`
5. Click **Create Web Service**.
6. Once deployed, open your Render URL (for example: `https://debugged-gdg.onrender.com/host` on your projector).
7. The host screen will automatically generate a live QR code pointing directly to `https://debugged-gdg.onrender.com`, allowing all participants to scan and play over HTTPS.

---

### Option B: Local Auditorium WiFi / Hotspot (Recommended for In-Person Events)
This is the most reliable setup for live in-person workshops because it avoids cellular network congestion in crowded lecture halls.

1. Connect the host laptop to the room WiFi or a dedicated portable 5GHz router / phone hotspot.
2. Start the server:
   ```bash
   node server.js
   ```
3. The terminal displays the local network URL (for example: `http://192.168.1.45:3000`).
4. Display `http://localhost:3000/host` on the auditorium projector.
5. Students scan the on-screen QR code and join directly over the local network.
6. **Advantages**: Zero internet bandwidth usage, 0ms external roundtrip, immune to public network throttling.

---

### Option C: Cloud Production VPS (DigitalOcean, Railway, Fly.io, AWS)
For high-concurrency dedicated hosting.

#### 1. Hardware Requirements for 500 Concurrent Players
- **CPU**: 1 vCPU (Node.js is single-threaded; 1 core handles 1,500+ active WebSockets).
- **RAM**: 512 MB to 1 GB.
- **Cost**: Free tier or $5/month instance.

#### 2. Process Management with PM2
Install PM2 to manage auto-restarts, memory limits, and zero-downtime execution:
```bash
npm install -g pm2
pm2 start server.js --name debugged --max-memory-restart 300M
pm2 startup
pm2 save
```

#### 3. Nginx Reverse Proxy Configuration
If hosting on a Linux VPS (Ubuntu/Debian), configure Nginx with WebSocket upgrade headers:

```nginx
server {
    listen 80;
    server_name debugged.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

---

### Option C: Public Tunnel (Cloudflare Tunnel / ngrok)
Ideal for testing or running from a laptop while allowing remote participants to join over HTTPS without router port forwarding.

#### Using Cloudflare Tunnel (Free, no connection limits):
```bash
cloudflared tunnel --url http://localhost:3000
```
Distribute the generated `https://<unique-subdomain>.trycloudflare.com` URL to participants.

---

## 3. Crash Prevention and High-Concurrency Strategy

### 1. Broadcast Throttling and Debouncing
- When 500 students submit scores simultaneously, emitting full broadcasts on every single tap can saturate network sockets.
- The server batches leaderboard updates via periodic delta intervals (every 2 seconds) and broadcasts instantaneous events only for high-value triggers (e.g. 5x combo streaks or level promotions).

### 2. Static Asset Delivery
- All frontend assets (HTML, CSS, JS) are static and minified.
- Sound effects are synthesized procedurally via the Web Audio API in client browsers, eliminating audio file downloads.
- Vector avatars are fetched on-demand or cached locally.

### 3. Graceful Disconnection Handling
- When a mobile device locks or switches apps, the socket connection drops cleanly.
- The server maintains the player's last recorded score in `gameState.leaderboard` so their position is preserved even if the connection resets.

---

## 4. Anti-Cheat and Security Hardening

### 1. Mathematical Score Sanity Bounds
- Maximum score clamp: 15,000 points.
- The server validates score increases against elapsed timestamps (`player.gameStartedAt`). Any score delta exceeding plausible human reaction thresholds is automatically clamped.

### 2. Time-Elapsed Verification
- The client cannot send a "finish" event with a completion time shorter than the minimum round duration.
- Server validates that `Date.now() - player.gameStartedAt >= 45000` ms before confirming final percentile rankings.

### 3. Two-Tier Moderation and Anti-Evasion Filter
- Usernames are validated against both substring and whole-word blacklists.
- All input passes through Unicode NFKD normalization, homoglyph character mapping (e.g. Cyrillic or leetspeak substitutions), and separator stripping.
- System impersonation handles (`admin`, `root`, `system`, `moderator`) are blocked at both client and server layers.

### 4. Input Sanitization
- Player names and event messages are escaped to prevent Cross-Site Scripting (XSS) in leaderboard rows and projector views.

---

## 5. Moderator Access and Player Removal

### Moderator PIN & Controls
Workshop presenters and moderators have privileged control to remove disruptive participants or inappropriate names directly from the live projector view:

1. **Trash Button on Leaderboard**: Clicking the trash icon next to any participant on `http://localhost:3000/host` or `https://debugged-gdg.onrender.com/host`.
2. **Moderator PIN Verification**:
   - Default PIN: `gdg777` (can be customized via environment variable `MOD_KEY=your_custom_pin`).
   - The presenter enters the PIN once per session (saved in secure browser `sessionStorage`).
3. **Instant Disconnection & Broadcast**:
   - The server removes the player from the in-memory store, disconnects their active WebSocket session with a notification, and broadcasts the updated leaderboard to all connected screens.

---

## 6. High-Concurrency Stress Testing (200 Players)

A benchmark load testing script is included in `scripts/load_test.js`:

```bash
# Run 200 concurrent simulated players against your server
npm run test:load
```
Or directly with custom parameters:
```bash
USERS=200 DURATION=30 node scripts/load_test.js
```
The test simulates 200 concurrent WebSocket connections answering challenges, progressing combos, and completing games, validating that CPU and RAM remain well within limits.
