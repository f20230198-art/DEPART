# DEBUGGED: Evolution Edition

> Rapid-fire Python, SQL, logic and beginner-AI quiz for CS freshers' orientation (3-minute round).
> Built for 70 to 500 students on mobile phones and laptops with a live projector leaderboard and workshop transition slides.

---

## Quick Start

### 1. Install and Run Server
```bash
npm install
npm start
```
Or run directly with Node:
```bash
node server.js
```

### 2. Open the Views
- **Projector View (Host)**: Open [http://localhost:3000/host](http://localhost:3000/host)
- **Player View (Students)**: Scan the QR code on the projector or visit `http://<YOUR_LOCAL_IP>:3000`

---

## System Capabilities

### 1. Retro Slit Horizon Logo and Interface
- Slit-striped typography (`>_ DEBUGGED`) inspired by classic terminals.
- High-contrast dark and light themes with instant switcher.
- Vector SVG favicon with terminal prompt.

### 2. Vector Avatars
- Open Peeps character avatar library with 12 distinct choices.
- Vector SVG rendering across mobile client and live host leaderboard rows.

### 3. Moderation and Validation Filter
- Two-tier moderation pipeline (whole-word and substring matching).
- Unicode NFKD decomposition, homoglyph normalization, and separator stripping.
- Restricts profane terms, slurs, harassment, and system impersonation handles (`admin`, `root`, `system`).

### 4. Scalable Live Leaderboard (Up to 500 Players)
- Synchronized memory store supporting 500 concurrent participants.
- Real-time search filter on host display.
- Synchronized live event feed across client refreshes.

### 5. Server-Side Anti-Cheat Protection
- Clamping of score values, delta rate limits, and elapsed duration checks.
- Single-pass token generator for syntax highlighting.

### 6. High-Entropy Question Bank and Zero-Repetition Engine
- 140 challenges (Python, SQL, logic puzzles, beginner AI) across 7 question types and 4 difficulty tiers.
- Session tracking ensures zero repeated questions per player run.
- Dynamic difficulty adjustment adapts questions based on 3-in-a-row performance.

### 7. Workshop Primer and Slide Deck
- Built-in slide deck transitioning from game match into web concepts.
- Presenter script and student cheatsheet in [`WORKSHOP_PRIMER.md`](WORKSHOP_PRIMER.md).
- Deployment and security guide in [`DEPLOYMENT_AND_ARCHITECTURE.md`](DEPLOYMENT_AND_ARCHITECTURE.md).

---

## Procedural Web Audio Engine
Sound effects (mechanical clicks, combo chimes, error tones, timer alerts) are synthesized via the Web Audio API without external audio asset downloads.

---

## Running the event (group start)

| Screen | URL | Who |
|---|---|---|
| Players | `http://<wifi-ip>:3000` (QR on the projector) | everyone, on phones |
| Projector | `/host` | shown to the room |
| Admin | `/admin` | the operator, on a laptop or phone |

**Moderator PIN:** set the `MOD_KEY` environment variable (Render: Environment tab). If it is not set the PIN is `gdg777`, so always set your own for the event.

**Flow**
1. Open `/host` on the projector and `/admin` on your laptop (enter the PIN).
2. Players scan the QR, enter a name and tap **Join the round**. They wait in the lobby.
3. When the lobby is full, press **Start round** in the admin panel. A 5-second countdown shows on every phone and on the projector, then everyone starts together and finishes together. The projector shows live standings.
4. **End round now** stops everyone immediately. **New round** sends people back to the lobby; late joiners wait for the next round.
5. **Free play** mode lets each player start on their own (the old behaviour). **Closed** stops new players joining.
6. Per player: **Kick** removes them (they can rejoin), **Ban** blocks that name and device.

State lives in server memory: a restart clears the board and the lobby, so avoid redeploying mid-event.
