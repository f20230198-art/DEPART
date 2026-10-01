// Player Client Controller - Encapsulated IIFE with Dynamic DOM Resolution & Anti-Tamper Protection
(() => {
  'use strict';

  let socket = null;
  if (typeof io !== 'undefined') {
    socket = io({ transports: ['websocket', 'polling'] });
  }

  const EVOLUTION_TIERS = [
    { minXP: 0, title: 'SCRIPT KIDDIE', icon: 'terminal', level: 1, nextXP: 200 },
    { minXP: 200, title: 'STACKOVERFLOW DEV', icon: 'code', level: 2, nextXP: 500 },
    { minXP: 500, title: 'CSS SURVIVOR', icon: 'palette', level: 3, nextXP: 900 },
    { minXP: 900, title: 'FRONTEND INTERN', icon: 'zap', level: 4, nextXP: 1400 },
    { minXP: 1400, title: 'FULL STACK WARRIOR', icon: 'layers', level: 5, nextXP: 2000 },
    { minXP: 2000, title: '10x ENGINEER', icon: 'flame', level: 6, nextXP: 2800 },
    { minXP: 2800, title: 'SYNTAX GOD', icon: 'crown', level: 7, nextXP: 4000 }
  ];

  const GAME_SECONDS = 180;
  const MAX_COMBO_MULTIPLIER = 3;

  // Boss rounds: 3 harder questions with a points multiplier, at these seconds-remaining marks
  const BOSS_PLAN = [
    { at: 120, label: 'BOSS ROUND', mult: 2 },
    { at: 50, label: 'FINAL BOSS', mult: 3 }
  ];
  const BOSS_TYPES = ['group_four', 'arrange', 'type_in', 'case_file', 'spot_bug', 'imposter', 'code_sequence'];
  const GOLDEN_MULT = 3;
  const NO_GOLD_TYPES = ['dont_click', 'reaction', 'memory_flash'];
  const LIFELINE_KINDS = ['fifty', 'skip', 'time'];
  const LIFELINE_NAMES = { fifty: '50:50', skip: 'SKIP', time: '+10 SECONDS' };
  const MAX_LIFELINES_PER_KIND = 3;

  // Stable per-device id so two players with the same display name never overwrite each other
  let clientId = '';
  try {
    clientId = localStorage.getItem('debugged_cid') || '';
    if (!clientId) {
      clientId = 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('debugged_cid', clientId);
    }
  } catch (e) {
    clientId = 'c_' + Math.random().toString(36).slice(2, 12);
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Private Scoped Game State
  const gameState = {
    playerName: localStorage.getItem('debugged_name') || '',
    playerAvatar: localStorage.getItem('debugged_avatar') || 'peep_1',
    score: 0,
    combo: 1,
    maxCombo: 1,
    xp: 0,
    tier: EVOLUTION_TIERS[0],
    difficultyTier: 1,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    seenChallengeIds: new Set(),
    isChallengeLocked: false,
    timeLeft: GAME_SECONDS,
    endAt: 0,
    overdriveShown: false,
    timerInterval: null,
    activeChallenge: null,
    challengeStartTime: 0,
    correctCount: 0,
    totalAttempts: 0,
    bugsSquashed: 0,
    isPlaying: false,
    lifelines: { fifty: 0, skip: 0, time: 0 },
    hint: null,
    boss: { active: false, remaining: 0, correct: 0, mult: 1, label: '' },
    bossesDone: [false, false],
    isGolden: false,
    goldenCooldown: 0,
    served: 0,
    joined: false,
    pendingJoin: false,
    inLobby: false,
    waitingNext: false,
    groupRound: false,
    countdownActive: false
  };

  // Dynamic Element Getters (Zero stale/null references)
  const dom = {
    screen(name) { return document.getElementById(`screen-${name}`); },
    get score() { return document.getElementById('hud-score'); },
    get timerVal() { return document.getElementById('hud-timer-val'); },
    get timerProgress() { return document.getElementById('hud-timer-progress'); },
    get combo() { return document.getElementById('hud-combo'); },
    get comboVal() { return document.getElementById('combo-val') || document.getElementById('hud-combo-val'); },
    get tierIcon() { return document.getElementById('tier-icon'); },
    get tierName() { return document.getElementById('tier-name'); },
    get xpFill() { return document.getElementById('hud-xp-fill'); },
    get tag() { return document.getElementById('challenge-tag'); },
    get instruction() { return document.getElementById('challenge-instruction'); },
    get body() { return document.getElementById('challenge-body'); },
    get feedback() { return document.getElementById('feedback-overlay') || document.getElementById('feedback-banner'); }
  };

  function showScreen(name) {
    const screens = ['welcome', 'lobby', 'game', 'gameover'];
    screens.forEach(s => {
      const el = dom.screen(s);
      if (el) {
        el.classList.toggle('active', s === name);
      }
    });
    if (window.refreshIcons) window.refreshIcons();
  }

  // Anti-Tamper: Block right-click context menu during gameplay
  document.addEventListener('contextmenu', (e) => {
    if (gameState.isPlaying) {
      e.preventDefault();
    }
  });

  // Anti-Tamper: Suppress common DevTools shortcut keys during active gameplay
  window.addEventListener('keydown', (e) => {
    if (!gameState.isPlaying) return;
    if (
      e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
      (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Render Avatar Picker Grid
  function initAvatarPicker() {
    const avatarPicker = document.getElementById('avatar-picker');
    if (avatarPicker && window.OPEN_PEEPS_AVATARS) {
      avatarPicker.innerHTML = '';
      window.OPEN_PEEPS_AVATARS.forEach(peep => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `avatar-option-btn ${peep.id === gameState.playerAvatar ? 'selected' : ''}`;
        btn.dataset.id = peep.id;
        btn.innerHTML = window.renderAvatarHTML ? window.renderAvatarHTML(peep.id, 44) : `<div class="peep-avatar-frame" style="width:44px;height:44px;"></div>`;

        btn.addEventListener('click', () => {
          document.querySelectorAll('.avatar-option-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          gameState.playerAvatar = peep.id;
          localStorage.setItem('debugged_avatar', peep.id);
          if (window.soundEngine) window.soundEngine.playClick();
        });

        avatarPicker.appendChild(btn);
      });
    }
  }

  // Theme UI Sync
  function updateThemeUI() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const iconKey = current === 'dark' ? 'sun' : 'moon';
    const welcomeIcon = document.getElementById('theme-icon-welcome');
    const gameIcon = document.getElementById('theme-icon-game');
    if (welcomeIcon && window.getIconHTML) {
      welcomeIcon.innerHTML = window.getIconHTML(iconKey, 15);
    }
    if (gameIcon && window.getIconHTML) {
      gameIcon.innerHTML = window.getIconHTML(iconKey, 15);
    }
  }

  function handleThemeToggle() {
    if (window.toggleTheme) {
      window.toggleTheme();
    }
    updateThemeUI();
    if (window.soundEngine) {
      window.soundEngine.playClick();
    }
  }

  // Setup Player Input Listeners
  function initInputListeners() {
    updateThemeUI();

    const themeWelcomeBtn = document.getElementById('btn-theme-toggle-welcome');
    if (themeWelcomeBtn) {
      themeWelcomeBtn.addEventListener('click', handleThemeToggle);
    }

    const themeGameBtn = document.getElementById('btn-theme-toggle-game');
    if (themeGameBtn) {
      themeGameBtn.addEventListener('click', handleThemeToggle);
    }

    const playerNameInput = document.getElementById('player-name');
    const usernameError = document.getElementById('username-error');

    if (playerNameInput) {
      playerNameInput.value = gameState.playerName;
      playerNameInput.addEventListener('input', (e) => {
        gameState.playerName = e.target.value;
        if (usernameError) {
          usernameError.classList.remove('active');
        }
      });

      playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const startBtn = document.getElementById('btn-start-game');
          if (startBtn) startBtn.click();
        }
      });
    }

    // Start Game with Username & Censorship Validation
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        const pInput = document.getElementById('player-name');
        const inputName = pInput ? pInput.value.trim() : '';
        const validation = window.validateUsername ? window.validateUsername(inputName) : { valid: true, cleanUsername: inputName || 'Coder' };

        if (!validation.valid) {
          const uErr = document.getElementById('username-error');
          if (uErr) {
            uErr.textContent = validation.message;
            uErr.classList.add('active');
          }
          if (pInput) pInput.focus();
          if (window.soundEngine) window.soundEngine.playError();
          return;
        }

        const uErr = document.getElementById('username-error');
        if (uErr) {
          uErr.classList.remove('active');
        }

        gameState.playerName = validation.cleanUsername;
        localStorage.setItem('debugged_name', gameState.playerName);

        if (window.soundEngine) {
          window.soundEngine.ensureContext();
          window.soundEngine.playClick();
        }

        if (socket && socket.connected) {
          joinRound();
        } else {
          startGame();
        }
      });
    }

    // Replay button
    const btnReplay = document.getElementById('btn-play-again');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => {
        if (window.soundEngine) {
          window.soundEngine.ensureContext();
          window.soundEngine.playClick();
        }

        if (socket && socket.connected) {
          if (isGroupMode() && gameState.joined) {
            // Wait for the next group round
            socket.emit('player_ready');
            enterLobby(roundInfo.phase === 'lobby' ? 'lobby' : 'waiting');
          } else {
            joinRound();
          }
        } else {
          startGame();
        }
      });
    }

    // Lobby: leave back to the name screen
    const lobbyBack = document.getElementById('btn-lobby-back');
    if (lobbyBack) {
      lobbyBack.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        gameState.inLobby = false;
        gameState.waitingNext = false;
        showScreen('welcome');
      });
    }

    // Switch profile / change name button
    const switchProfileBtn = document.getElementById('btn-switch-profile');
    if (switchProfileBtn) {
      switchProfileBtn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.playClick();
        localStorage.removeItem('debugged_has_completed');
        showScreen('welcome');
        const pInput = document.getElementById('player-name');
        if (pInput) pInput.focus();
      });
    }

    // Sound toggles (welcome + in-game share one state)
    const syncSoundUI = () => {
      const isMuted = window.soundEngine ? window.soundEngine.muted : false;
      ['sound-icon-welcome', 'sound-icon-game'].forEach(id => {
        const iconSpan = document.getElementById(id);
        if (iconSpan && window.getIconHTML) {
          iconSpan.innerHTML = window.getIconHTML(isMuted ? 'volume-x' : 'volume-2', id.endsWith('game') ? 16 : 16);
        }
      });
      const welcomeBtn = document.getElementById('btn-sound-toggle-welcome');
      const labelSpan = welcomeBtn && welcomeBtn.querySelector('span:last-child');
      if (labelSpan) labelSpan.textContent = isMuted ? 'Sound OFF' : 'Sound ON';
    };

    ['btn-sound-toggle-welcome', 'btn-sound-toggle-game'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (window.soundEngine) window.soundEngine.toggleMute();
        syncSoundUI();
      });
    });
    syncSoundUI();
  }

  // ---------------------------------------------------------------- group rounds: the host starts everyone together
  let roundInfo = null;
  let clockOffset = 0; // server clock minus this phone's clock
  let countdownTimer = null;
  let joinTimeout = null;

  function isGroupMode() {
    return !!(socket && socket.connected && roundInfo && roundInfo.mode === 'group');
  }

  function updateStartButton() {
    const label = document.querySelector('#btn-start-game span');
    if (label) label.textContent = isGroupMode() ? 'JOIN THE ROUND' : 'START 3-MIN BLITZ';
  }

  function enterLobby(status) {
    gameState.inLobby = status === 'lobby';
    gameState.waitingNext = status === 'waiting';
    const title = document.getElementById('lobby-title');
    const msg = document.getElementById('lobby-message');
    const name = document.getElementById('lobby-name');
    if (name) name.textContent = gameState.playerName;
    if (title) title.textContent = status === 'waiting' ? 'HOLD TIGHT!' : "YOU'RE IN!";
    if (msg) {
      msg.textContent = status === 'waiting'
        ? 'A round is running right now. You will join the next one.'
        : 'Waiting for the host to start. Keep this screen open.';
    }
    showScreen('lobby');
  }

  function startFreeRound() {
    if (socket && socket.connected) socket.emit('player_start_game');
    startGame();
  }

  // Sends the join; the server answers with player_init (ok) or join_rejected (banned / closed)
  function joinRound() {
    gameState.pendingJoin = true;
    socket.emit('player_join', { name: gameState.playerName, avatar: gameState.playerAvatar, clientId });
    clearTimeout(joinTimeout);
    joinTimeout = setTimeout(() => {
      if (!gameState.pendingJoin) return;
      gameState.pendingJoin = false;
      gameState.joined = true;
      if (isGroupMode()) enterLobby('lobby'); else startFreeRound();
    }, 3500);
  }

  function hideCountdown() {
    clearInterval(countdownTimer);
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) overlay.hidden = true;
    gameState.countdownActive = false;
  }

  function beginCountdown(startLocal, endLocal) {
    if (startLocal <= Date.now()) return; // missed it; wait for the next round
    gameState.countdownActive = true;
    gameState.groupRound = true;
    const overlay = document.getElementById('countdown-overlay');
    const num = document.getElementById('countdown-num');
    if (overlay) overlay.hidden = false;

    let last = null;
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      const msLeft = startLocal - Date.now();
      const secs = Math.ceil(msLeft / 1000);
      if (secs > 0 && secs !== last) {
        last = secs;
        if (num) { num.textContent = secs; num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); }
        if (window.soundEngine) window.soundEngine.playTimerTick(secs <= 3);
      }
      if (msLeft <= 0) {
        clearInterval(countdownTimer);
        if (num) { num.textContent = 'GO!'; num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); }
        if (window.soundEngine) window.soundEngine.playBossAlarm();
        gameState.inLobby = false;
        gameState.countdownActive = false;
        if (socket && socket.connected) socket.emit('player_start_game');
        startGame({ endAt: endLocal });
        setTimeout(() => { if (overlay) overlay.hidden = true; }, 600);
      }
    }, 100);
  }

  function applyRoundInfo(info) {
    if (!info) return;
    roundInfo = info;
    clockOffset = info.serverNow - Date.now();
    updateStartButton();

    // Admin switched to free play while people were waiting: just let them start
    if (info.mode === 'free') {
      if (gameState.inLobby && !gameState.isPlaying) {
        gameState.inLobby = false;
        gameState.waitingNext = false;
        startFreeRound();
      }
      return;
    }

    if (info.phase === 'lobby' && gameState.waitingNext) enterLobby('lobby');

    if (info.phase === 'countdown' && gameState.inLobby && !gameState.isPlaying && !gameState.countdownActive) {
      beginCountdown(info.startsAt - clockOffset, info.endsAt - clockOffset);
    }

    if (info.phase === 'ended' && info.forced) {
      if (gameState.countdownActive) { hideCountdown(); gameState.groupRound = false; enterLobby('waiting'); }
      else if (gameState.isPlaying && gameState.groupRound) endGame();
    }
  }

  // Calculate evolution tier
  function getTier(xp) {
    let tier = EVOLUTION_TIERS[0];
    for (const t of EVOLUTION_TIERS) {
      if (xp >= t.minXP) tier = t;
    }
    return tier;
  }

  function updateHUD() {
    if (dom.score) dom.score.textContent = gameState.score.toLocaleString();
    if (dom.comboVal) dom.comboVal.textContent = gameState.combo;
    
    if (dom.combo) {
      if (gameState.combo >= 4) {
        dom.combo.classList.add('fire');
      } else {
        dom.combo.classList.remove('fire');
      }
    }

    const currentTier = getTier(gameState.xp);
    if (currentTier.level > gameState.tier.level) {
      if (window.soundEngine) window.soundEngine.playLevelUp();
      if (window.confetti) window.confetti.fire({ count: 60 });
      showFeedback(`EVOLVED: ${currentTier.title}!`, 'correct');
    }
    gameState.tier = currentTier;

    if (dom.tierIcon && window.getIconHTML) dom.tierIcon.innerHTML = window.getIconHTML(currentTier.icon, 14);
    if (dom.tierName) dom.tierName.textContent = currentTier.title;

    const prevMin = currentTier.minXP;
    const nextXP = currentTier.nextXP;
    const progressPct = Math.min(100, Math.max(0, ((gameState.xp - prevMin) / (nextXP - prevMin)) * 100));
    if (dom.xpFill) dom.xpFill.style.width = `${progressPct}%`;
  }

  // Feedback Banner
  function showFeedback(text, type = 'correct') {
    const banner = dom.feedback;
    if (!banner) return;
    banner.textContent = text;
    banner.className = `feedback-overlay ${type === 'correct' ? 'show-correct' : 'show-wrong'}`;
    setTimeout(() => {
      const fb = dom.feedback;
      if (fb) fb.className = 'feedback-overlay';
    }, 600);
  }

  // Mobile Haptic Vibration
  function vibrate(pattern = [50]) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  // Start Game Loop
  function startGame(opts = {}) {
    gameState.score = 0;
    gameState.combo = 1;
    gameState.maxCombo = 1;
    gameState.xp = 0;
    gameState.tier = EVOLUTION_TIERS[0];
    gameState.difficultyTier = 1;
    gameState.consecutiveCorrect = 0;
    gameState.consecutiveIncorrect = 0;
    gameState.seenChallengeIds = new Set();
    gameState.isChallengeLocked = false;
    gameState.endAt = opts.endAt || (Date.now() + GAME_SECONDS * 1000);
    gameState.timeLeft = Math.max(0, Math.ceil((gameState.endAt - Date.now()) / 1000));
    gameState.overdriveShown = false;
    gameState.correctCount = 0;
    gameState.totalAttempts = 0;
    gameState.bugsSquashed = 0;
    gameState.isPlaying = true;
    gameState.lifelines = { fifty: 0, skip: 0, time: 0 };
    gameState.hint = null;
    gameState.boss = { active: false, remaining: 0, correct: 0, mult: 1, label: '' };
    gameState.bossesDone = [false, false];
    gameState.isGolden = false;
    gameState.goldenCooldown = 0;
    gameState.served = 0;
    renderLifelines();
    updateBanner();

    updateHUD();
    showScreen('game');

    const maxDash = 125.6;
    if (dom.timerProgress) {
      dom.timerProgress.style.strokeDasharray = maxDash;
      dom.timerProgress.style.strokeDashoffset = 0;
      dom.timerProgress.classList.remove('timer-urgent');
    }

    if (dom.timerVal) dom.timerVal.textContent = formatTime(gameState.timeLeft);

    // Clock-based timer: stays accurate even if the phone throttles the tab
    let lastTickSecond = -1;
    clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
      gameState.timeLeft = Math.max(0, Math.ceil((gameState.endAt - Date.now()) / 1000));
      if (dom.timerVal) dom.timerVal.textContent = formatTime(gameState.timeLeft);

      const dashOffset = maxDash * (1 - Math.min(1, gameState.timeLeft / GAME_SECONDS));
      if (dom.timerProgress) dom.timerProgress.style.strokeDashoffset = dashOffset;

      if (gameState.timeLeft <= 10) {
        if (dom.timerProgress) dom.timerProgress.classList.add('timer-urgent');
        if (gameState.timeLeft !== lastTickSecond && gameState.timeLeft > 0) {
          lastTickSecond = gameState.timeLeft;
          if (window.soundEngine) window.soundEngine.playTimerTick(gameState.timeLeft <= 5);
        }
      }

      if (gameState.timeLeft <= 30 && !gameState.overdriveShown) {
        gameState.overdriveShown = true;
        if (window.soundEngine) window.soundEngine.playBossAlarm();
        showFeedback('FINAL 30s: MAXIMUM OVERDRIVE!', 'correct');
      }

      if (gameState.timeLeft <= 0) {
        endGame();
      }
    }, 250);

    nextChallenge();
  }

  // End Game
  function endGame() {
    clearInterval(gameState.timerInterval);
    gameState.isPlaying = false;
    gameState.isChallengeLocked = true;
    gameState.groupRound = false;
    gameState.inLobby = false;

    if (window.soundEngine) window.soundEngine.playGameOver();
    if (window.confetti) window.confetti.fire({ count: 120, upward: true });
    vibrate([100, 50, 100, 50, 200]);

    const prevHighScore = parseInt(localStorage.getItem('debugged_high_score') || '0', 10);
    const isNewRecord = gameState.score > prevHighScore;
    if (isNewRecord) {
      localStorage.setItem('debugged_high_score', gameState.score);
    }

    const highScoreBanner = document.getElementById('high-score-banner');
    if (highScoreBanner) {
      highScoreBanner.style.display = isNewRecord ? 'block' : 'none';
    }

    const accuracy = gameState.totalAttempts > 0 
      ? Math.round((gameState.correctCount / gameState.totalAttempts) * 100) 
      : 100;

    localStorage.setItem('debugged_has_completed', 'true');
    localStorage.setItem('debugged_last_score', gameState.score);
    localStorage.setItem('debugged_last_accuracy', accuracy);
    localStorage.setItem('debugged_last_combo', gameState.maxCombo);
    localStorage.setItem('debugged_last_bugs', gameState.bugsSquashed);
    localStorage.setItem('debugged_last_tier_icon', gameState.tier.icon);
    localStorage.setItem('debugged_last_tier_title', gameState.tier.title);

    const fScore = document.getElementById('final-score-num');
    if (fScore) fScore.textContent = gameState.score.toLocaleString();

    const fIcon = document.getElementById('final-tier-icon');
    if (fIcon && window.getIconHTML) fIcon.innerHTML = window.getIconHTML(gameState.tier.icon, 16);

    const fTitle = document.getElementById('final-tier-title');
    if (fTitle) fTitle.textContent = gameState.tier.title;

    const fCombo = document.getElementById('final-max-combo');
    if (fCombo) fCombo.textContent = `x${gameState.maxCombo}`;

    const fAcc = document.getElementById('final-accuracy');
    if (fAcc) fAcc.textContent = `${accuracy}%`;

    const fBugs = document.getElementById('final-bugs-fixed');
    if (fBugs) fBugs.textContent = gameState.bugsSquashed;

    if (socket && socket.connected) {
      socket.emit('player_finish', {
        clientId,
        name: gameState.playerName,
        avatar: gameState.playerAvatar,
        score: gameState.score,
        maxCombo: gameState.maxCombo,
        xp: gameState.score,
        accuracy,
        stats: {
          bugsSquashed: gameState.bugsSquashed,
          correctCount: gameState.correctCount,
          totalAttempts: gameState.totalAttempts
        }
      });

      socket.once('finish_confirmed', (res) => {
        const rVal = document.getElementById('final-rank-val');
        if (rVal) rVal.textContent = `#${res.rank}`;
        const rLabel = document.querySelector('.stat-rank .stat-label');
        if (rLabel) rLabel.textContent = `of ${res.totalScores} players`;
        if (res.leaderboard) {
          renderPlayerMobileLeaderboard(res.leaderboard);
        }
      });
    } else {
      const rVal = document.getElementById('final-rank-val');
      if (rVal) rVal.textContent = '-';
    }

    showScreen('gameover');
  }

  // ---------------------------------------------------------------- helpers
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHTML(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setHeader(data, fallbackIcon) {
    if (dom.tag && window.getIconHTML) dom.tag.innerHTML = `${window.getIconHTML(data.icon || fallbackIcon, 14)} <span>${data.title}</span>`;
    if (dom.instruction) dom.instruction.textContent = data.instruction;
  }

  function lockBody() {
    gameState.isChallengeLocked = true;
    if (dom.body) dom.body.style.pointerEvents = 'none';
  }

  // ---------------------------------------------------------------- lifelines
  function renderLifelines() {
    LIFELINE_KINDS.forEach((kind) => {
      const btn = document.getElementById(`ll-${kind}`);
      if (!btn) return;
      const n = gameState.lifelines[kind];
      btn.disabled = n <= 0;
      const count = btn.querySelector('.ll-count');
      if (count) count.textContent = n;
    });
  }

  // Earn one every 5-combo; hand out the kind you hold the fewest of
  function grantLifeline() {
    const kinds = LIFELINE_KINDS.filter(k => gameState.lifelines[k] < MAX_LIFELINES_PER_KIND);
    if (!kinds.length) return '';
    const fewest = Math.min(...kinds.map(k => gameState.lifelines[k]));
    const pool = kinds.filter(k => gameState.lifelines[k] === fewest);
    const kind = pool[Math.floor(Math.random() * pool.length)];
    gameState.lifelines[kind]++;
    renderLifelines();
    const btn = document.getElementById(`ll-${kind}`);
    if (btn) {
      btn.classList.remove('just-earned');
      void btn.offsetWidth;
      btn.classList.add('just-earned');
    }
    return `LIFELINE: ${LIFELINE_NAMES[kind]}!`;
  }

  function useLifeline(kind) {
    if (!gameState.isPlaying || gameState.lifelines[kind] <= 0) return;
    const btn = document.getElementById(`ll-${kind}`);

    if (kind === 'time') {
      gameState.endAt += 10000;
      gameState.timeLeft = Math.max(0, Math.ceil((gameState.endAt - Date.now()) / 1000));
      gameState.lifelines.time--;
      showFeedback('+10 SECONDS!', 'correct');
    } else {
      if (gameState.isChallengeLocked) return;

      if (kind === 'fifty') {
        if (!gameState.hint || !gameState.hint()) {
          if (btn) { btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); }
          return;
        }
        gameState.lifelines.fifty--;
        showFeedback('50:50 USED!', 'correct');
      }

      if (kind === 'skip') {
        lockBody();
        gameState.lifelines.skip--;
        const bossMsg = gameState.boss.active ? finishBossStep(false) : '';
        showFeedback(bossMsg || 'SKIPPED!', 'correct');
        setTimeout(nextChallenge, 200);
      }
    }
    if (window.soundEngine) window.soundEngine.playClick();
    renderLifelines();
  }

  // ---------------------------------------------------------------- golden + boss
  function specialMultiplier() {
    if (gameState.boss.active) return gameState.boss.mult;
    return gameState.isGolden ? GOLDEN_MULT : 1;
  }

  function updateBanner() {
    const box = document.getElementById('challenge-box');
    const banner = document.getElementById('challenge-banner');
    const boss = gameState.boss;
    if (box) {
      box.classList.toggle('golden', gameState.isGolden && !boss.active);
      box.classList.toggle('boss', boss.active);
    }
    if (!banner) return;
    if (boss.active) {
      banner.hidden = false;
      banner.textContent = `${boss.label} ${4 - boss.remaining}/3 · ${boss.mult}x POINTS`;
    } else if (gameState.isGolden) {
      banner.hidden = false;
      banner.textContent = `GOLDEN QUESTION · ${GOLDEN_MULT}x POINTS`;
    } else {
      banner.hidden = true;
      banner.textContent = '';
    }
  }

  function maybeStartBoss() {
    if (gameState.boss.active) return;
    for (let i = 0; i < BOSS_PLAN.length; i++) {
      const plan = BOSS_PLAN[i];
      if (!gameState.bossesDone[i] && gameState.timeLeft <= plan.at && gameState.timeLeft > 12) {
        gameState.bossesDone[i] = true;
        gameState.boss = { active: true, remaining: 3, correct: 0, mult: plan.mult, label: plan.label };
        if (window.soundEngine) window.soundEngine.playBossAlarm();
        showFeedback(`${plan.label}!`, 'correct');
        return;
      }
    }
  }

  // Called once per boss question; returns a message when the chain ends
  function finishBossStep(wasCorrect) {
    const boss = gameState.boss;
    boss.remaining--;
    if (wasCorrect) boss.correct++;
    if (boss.remaining > 0) return '';

    boss.active = false;
    if (boss.correct === 3) {
      const bonus = 40 * boss.mult;
      gameState.score += bonus;
      gameState.xp += bonus;
      if (window.confetti) window.confetti.fire({ count: 80 });
      return `BOSS DOWN! +${bonus}`;
    }
    return `BOSS OVER: ${boss.correct}/3`;
  }

  // ---------------------------------------------------------------- answers
  // opts.mult: format multiplier (harder formats pay more); opts.fast: seconds that still count as speedy
  function onCorrectAnswer(bonusLabel = '', opts = {}) {
    if (!gameState.isPlaying) return;

    const elapsed = (Date.now() - gameState.challengeStartTime) / 1000;
    const isSpeedy = elapsed < (opts.fast || 3);
    const challengeTier = (gameState.activeChallenge && gameState.activeChallenge.tier) || gameState.difficultyTier;
    const basePoints = 10 + (challengeTier - 1) * 5;
    const speedBonus = isSpeedy ? 5 : 0;
    const comboMultiplier = Math.min(MAX_COMBO_MULTIPLIER, 1 + (gameState.combo - 1) * 0.1);
    const wasGolden = gameState.isGolden && !gameState.boss.active;
    const pointsEarned = Math.round((basePoints + speedBonus) * comboMultiplier * (opts.mult || 1) * specialMultiplier());

    gameState.score += pointsEarned;
    gameState.xp += pointsEarned;
    gameState.combo++;
    gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
    gameState.correctCount++;
    gameState.totalAttempts++;

    let lifelineMsg = '';
    if (gameState.combo % 5 === 0) lifelineMsg = grantLifeline();

    const inBoss = gameState.boss.active;
    let ddaMessage = '';
    let bossMsg = '';
    if (inBoss) {
      bossMsg = finishBossStep(true);
    } else {
      gameState.consecutiveIncorrect = 0;
      gameState.consecutiveCorrect++;
      if (gameState.consecutiveCorrect >= 3 && gameState.difficultyTier < 4) {
        gameState.difficultyTier++;
        gameState.consecutiveCorrect = 0;
        if (gameState.difficultyTier === 2) ddaMessage = 'LEVEL UP: MEDIUM!';
        else if (gameState.difficultyTier === 3) ddaMessage = 'HARD MODE UNLOCKED!';
        else if (gameState.difficultyTier === 4) ddaMessage = 'EXPERT TIER! WOW!';
      }
    }

    if (window.soundEngine) window.soundEngine.playSuccess(gameState.combo);
    vibrate([40]);
    const label = wasGolden ? `GOLDEN x${GOLDEN_MULT}!` : (bonusLabel || (isSpeedy ? 'LIGHTNING FAST!' : 'PERFECT!'));
    showFeedback(bossMsg || ddaMessage || lifelineMsg || `+${pointsEarned} ${label}`, 'correct');

    if (socket && socket.connected) {
      socket.emit('player_progress', {
        score: gameState.score,
        combo: gameState.combo,
        xp: gameState.xp,
        comboTrigger: gameState.combo >= 5
      });
    }

    updateHUD();
    setTimeout(nextChallenge, 220);
  }

  // delay: how long the right answer stays on screen before the next question
  function onWrongAnswer(customPenalty = 5, customMsg = 'COMBO BROKEN!', delay = 350) {
    if (!gameState.isPlaying) return;

    gameState.score = Math.max(0, gameState.score - customPenalty);
    gameState.totalAttempts++;

    let ddaMessage = '';
    let bossMsg = '';
    if (gameState.boss.active) {
      bossMsg = finishBossStep(false);
    } else {
      gameState.consecutiveCorrect = 0;
      gameState.consecutiveIncorrect++;
      if (gameState.consecutiveIncorrect >= 3 && gameState.difficultyTier > 1) {
        gameState.difficultyTier = Math.max(1, gameState.difficultyTier - 1);
        gameState.consecutiveIncorrect = 0;
        ddaMessage = 'EASING UP A BIT';
      }
    }

    if (window.soundEngine) {
      if (gameState.combo > 2) {
        window.soundEngine.playComboBreak();
      } else {
        window.soundEngine.playError();
      }
    }

    gameState.combo = 1;
    vibrate([150, 80, 150]);
    showFeedback(bossMsg || ddaMessage || customMsg, 'wrong');

    if (socket && socket.connected) {
      socket.emit('player_progress', {
        score: gameState.score,
        combo: gameState.combo,
        xp: gameState.xp
      });
    }

    updateHUD();
    setTimeout(nextChallenge, delay);
  }

  // Fetch and render next challenge (forced = debug/testing hook only)
  function nextChallenge(forced) {
    if (!gameState.isPlaying) return;

    maybeStartBoss();

    const elapsed = GAME_SECONDS - gameState.timeLeft;
    const bossActive = gameState.boss.active;
    const tier = bossActive ? Math.max(2, gameState.difficultyTier) : gameState.difficultyTier;
    let challenge = forced && forced.type ? forced : null;
    if (!challenge) {
      challenge = (window.CHALLENGE_ENGINE && window.CHALLENGE_ENGINE.getRandomChallenge)
        ? window.CHALLENGE_ENGINE.getRandomChallenge(elapsed, tier, gameState.seenChallengeIds, bossActive ? { types: BOSS_TYPES } : null)
        : null;
    }

    if (!challenge) {
      console.warn('Challenge engine unavailable');
      return;
    }

    if (challenge.id) {
      gameState.seenChallengeIds.add(challenge.id);
    }

    // Golden questions: now and then, never back to back, never inside a boss chain, never on the timing games
    gameState.served++;
    gameState.isGolden = false;
    if (!bossActive) {
      if (gameState.goldenCooldown > 0) {
        gameState.goldenCooldown--;
      } else if (gameState.served >= 4 && !NO_GOLD_TYPES.includes(challenge.type) && Math.random() < 0.12) {
        gameState.isGolden = true;
        gameState.goldenCooldown = 6;
      }
    }
    updateBanner();

    gameState.activeChallenge = challenge;
    gameState.challengeStartTime = Date.now();
    gameState.isChallengeLocked = false;
    gameState.hint = null;

    if (dom.body) {
      dom.body.innerHTML = '';
      dom.body.style.pointerEvents = 'auto';
    }

    switch (challenge.type) {
      case 'spot_bug':
        renderSpotBug(challenge.data);
        break;
      case 'reaction':
        renderReaction(challenge.data);
        break;
      case 'code_sequence':
        renderCodeSequence(challenge.data);
        break;
      case 'imposter':
        renderImposter(challenge.data);
        break;
      case 'quiz':
      case 'network_web':
        renderNetworkWeb(challenge.data);
        break;
      case 'dont_click':
        renderDontClick(challenge.data);
        break;
      case 'memory_flash':
        renderMemoryFlash(challenge.data);
        break;
      case 'type_in':
      case 'case_file':
        renderTypeIn(challenge.data);
        break;
      case 'arrange':
        renderArrange(challenge.data);
        break;
      case 'group_four':
        renderGroupFour(challenge.data);
        break;
      default:
        renderSpotBug(challenge.data);
    }

    if (window.refreshIcons) window.refreshIcons();
  }

  // 50:50 for multiple choice: hide up to two wrong options
  function choiceHint(grid, correctIdx) {
    return () => {
      if (gameState.isChallengeLocked) return false;
      const wrongEls = [...grid.children].filter((el, i) => i !== correctIdx && !el.classList.contains('is-dimmed'));
      const drop = Math.min(2, wrongEls.length - 1);
      if (drop < 1) return false;
      shuffle(wrongEls).slice(0, drop).forEach(el => el.classList.add('is-dimmed'));
      return true;
    };
  }

  // ---------------------------------------------------------------- RENDERER: type it in (also case files)
  function renderTypeIn(data) {
    setHeader(data, 'code');
    const normalize = (v) => String(v).toLowerCase().replace(/["'`\s]/g, '');
    const accepted = new Set(data.answers.map(normalize));
    const fastSecs = 14;
    const mult = data.evidence ? 2 : 1.5;

    if (data.evidence) {
      const ev = document.createElement('div');
      ev.className = 'evidence';
      ev.innerHTML = `<div class="evidence-tab">EVIDENCE</div>` +
        data.evidence.map(line => `<div class="evidence-line">${escapeHTML(line)}</div>`).join('');
      if (dom.body) dom.body.appendChild(ev);
    } else if (data.steps) {
      const stepsBox = document.createElement('div');
      stepsBox.className = 'code-container';
      stepsBox.style.padding = '0.8rem 1rem';
      stepsBox.style.fontFamily = 'var(--font-mono)';
      stepsBox.style.fontSize = '0.9rem';
      stepsBox.style.lineHeight = '1.6';
      data.steps.forEach(step => {
        const row = document.createElement('div');
        if (step.includes('______')) { row.style.background = 'rgba(255, 111, 174, 0.28)'; row.style.borderRadius = '6px'; row.style.padding = '0 0.3rem'; }
        row.textContent = step;
        stepsBox.appendChild(row);
      });
      if (dom.body) dom.body.appendChild(stepsBox);
    }

    const row = document.createElement('form');
    row.className = 'type-row';
    row.setAttribute('autocomplete', 'off');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'field type-field';
    input.placeholder = 'Type your answer';
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('enterkeyhint', 'done');
    input.setAttribute('aria-label', 'Your answer');
    if (data.numeric) input.setAttribute('inputmode', 'numeric');

    const check = document.createElement('button');
    check.type = 'submit';
    check.className = 'btn-marker btn-sm';
    check.textContent = 'CHECK';

    row.appendChild(input);
    row.appendChild(check);
    if (dom.body) dom.body.appendChild(row);

    row.addEventListener('submit', (e) => {
      e.preventDefault();
      if (gameState.isChallengeLocked || !gameState.isPlaying) return;
      const typed = normalize(input.value);
      if (!typed) return;
      lockBody();
      input.blur();

      if (accepted.has(typed)) {
        input.classList.add('is-correct');
        onCorrectAnswer(data.evidence ? 'CASE CLOSED!' : 'NAILED IT!', { mult, fast: fastSecs });
      } else {
        input.classList.add('is-wrong');
        const reveal = document.createElement('div');
        reveal.className = 'answer-reveal';
        reveal.innerHTML = `Answer: <b>${escapeHTML(data.answers[0])}</b>`;
        if (dom.body) dom.body.appendChild(reveal);
        onWrongAnswer(5, 'NOT QUITE!', 1600);
      }
    });

    let hinted = false;
    gameState.hint = () => {
      if (hinted || gameState.isChallengeLocked) return false;
      hinted = true;
      input.placeholder = `Starts with "${data.answers[0].charAt(0)}"`;
      return true;
    };
  }

  // ---------------------------------------------------------------- RENDERER: arrange in order
  function renderArrange(data) {
    setHeader(data, 'layers');
    const items = data.lines.map((text, i) => ({ i, text }));
    const n = items.length;

    let pool = shuffle([...items]);
    for (let tries = 0; tries < 6 && pool.every((it, k) => it.i === k); tries++) shuffle(pool);
    let placed = [];

    const wrap = document.createElement('div');
    wrap.className = 'arrange';
    const slotsEl = document.createElement('div');
    slotsEl.className = 'arrange-slots';
    const label = document.createElement('div');
    label.className = 'arrange-label';
    label.textContent = 'Tap the pieces in order';
    const poolEl = document.createElement('div');
    poolEl.className = 'arrange-pool';
    wrap.appendChild(slotsEl);
    wrap.appendChild(label);
    wrap.appendChild(poolEl);
    if (dom.body) dom.body.appendChild(wrap);

    const chipHTML = (text) => data.mono ? highlightSyntax(text) : escapeHTML(text);

    function draw() {
      slotsEl.innerHTML = '';
      for (let k = 0; k < n; k++) {
        const slot = document.createElement('div');
        slot.className = 'arrange-slot';
        const num = document.createElement('span');
        num.className = 'arrange-num';
        num.textContent = k + 1;
        slot.appendChild(num);
        if (placed[k]) {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `arrange-chip${data.mono ? ' mono' : ''}`;
          chip.innerHTML = chipHTML(placed[k].text);
          chip.addEventListener('click', () => {
            if (gameState.isChallengeLocked || !gameState.isPlaying) return;
            const [it] = placed.splice(k, 1);
            pool.push(it);
            draw();
          });
          slot.appendChild(chip);
        } else {
          slot.classList.add('empty');
        }
        slotsEl.appendChild(slot);
      }

      poolEl.innerHTML = '';
      pool.forEach((it) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `arrange-chip${data.mono ? ' mono' : ''}`;
        chip.innerHTML = chipHTML(it.text);
        chip.addEventListener('click', () => {
          if (gameState.isChallengeLocked || !gameState.isPlaying) return;
          pool = pool.filter(p => p !== it);
          placed.push(it);
          draw();
          if (placed.length === n) setTimeout(judge, 250);
        });
        poolEl.appendChild(chip);
      });
    }

    function judge() {
      if (gameState.isChallengeLocked || !gameState.isPlaying) return;
      lockBody();
      const slotEls = slotsEl.querySelectorAll('.arrange-slot');
      const right = placed.every((it, k) => it.i === k);
      placed.forEach((it, k) => slotEls[k].classList.add(it.i === k ? 'is-correct' : 'is-wrong'));

      if (right) {
        onCorrectAnswer('IN ORDER!', { mult: 2, fast: 16 });
      } else {
        const reveal = document.createElement('div');
        reveal.className = 'answer-reveal arrange-reveal';
        reveal.innerHTML = `<div>Right order:</div>` + items.map((it, k) =>
          `<div class="arrange-reveal-line${data.mono ? ' mono' : ''}"><span>${k + 1}</span>${chipHTML(it.text)}</div>`).join('');
        wrap.appendChild(reveal);
        onWrongAnswer(5, 'NOT QUITE!', 2400);
      }
    }

    // 50:50 for arrange: lock in the next correct piece
    gameState.hint = () => {
      if (gameState.isChallengeLocked) return false;
      let k = 0;
      while (k < placed.length && placed[k].i === k) k++;
      if (k >= n - 1) return false;
      const keep = placed.slice(0, k);
      const rest = items.filter(it => !keep.includes(it));
      placed = keep.concat(rest.filter(it => it.i === k));
      pool = shuffle(rest.filter(it => it.i !== k));
      draw();
      return true;
    };

    draw();
  }

  // ---------------------------------------------------------------- RENDERER: 16 cards, pick the 4 that belong
  function renderGroupFour(data) {
    setHeader(data, 'target');
    const cards = shuffle([
      ...data.right.map(t => ({ t, ok: true })),
      ...data.wrong.map(t => ({ t, ok: false }))
    ]);
    const selected = new Set();

    const counter = document.createElement('div');
    counter.className = 'group-count';
    const grid = document.createElement('div');
    grid.className = 'group-grid';
    if (dom.body) {
      dom.body.appendChild(counter);
      dom.body.appendChild(grid);
    }

    const updateCounter = () => { counter.textContent = `${selected.size} of 4 picked`; };

    const els = cards.map((card, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `group-card${data.mono ? ' mono' : ''}`;
      btn.textContent = card.t;
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        if (gameState.isChallengeLocked || !gameState.isPlaying) return;
        if (selected.has(idx)) {
          selected.delete(idx);
        } else {
          if (selected.size >= 4) return;
          selected.add(idx);
        }
        btn.classList.toggle('selected', selected.has(idx));
        btn.setAttribute('aria-pressed', String(selected.has(idx)));
        updateCounter();
        if (selected.size === 4) setTimeout(judge, 220);
      });
      grid.appendChild(btn);
      return btn;
    });
    updateCounter();

    function judge() {
      if (gameState.isChallengeLocked || !gameState.isPlaying || selected.size !== 4) return;
      lockBody();
      const allRight = [...selected].every(idx => cards[idx].ok);
      els.forEach((el, idx) => {
        el.classList.remove('selected');
        if (selected.has(idx)) el.classList.add(cards[idx].ok ? 'is-correct' : 'is-wrong');
        else if (!allRight && cards[idx].ok) el.classList.add('is-reveal');
      });
      if (allRight) {
        onCorrectAnswer('GROUPED!', { mult: 2.5, fast: 18 });
      } else {
        onWrongAnswer(5, 'NOT QUITE!', 2200);
      }
    }

    // 50:50 for groups: pre-pick two of the right cards
    gameState.hint = () => {
      if (gameState.isChallengeLocked) return false;
      cards.forEach((card, idx) => {
        if (selected.has(idx) && !card.ok) {
          selected.delete(idx);
          els[idx].classList.remove('selected');
        }
      });
      let okPicked = [...selected].filter(idx => cards[idx].ok).length;
      if (okPicked >= 2) return false;
      cards.forEach((card, idx) => {
        if (okPicked < 2 && card.ok && !selected.has(idx)) {
          selected.add(idx);
          els[idx].classList.add('selected');
          okPicked++;
        }
      });
      updateCounter();
      return true;
    };
  }

  // RENDERER: Spot the Bug
  function renderSpotBug(data) {
    if (dom.tag && window.getIconHTML) dom.tag.innerHTML = `${window.getIconHTML(data.icon || 'bug', 14)} <span>${data.title}</span>`;
    if (dom.instruction) dom.instruction.textContent = data.instruction;

    const container = document.createElement('div');
    container.className = 'code-container';

    const header = document.createElement('div');
    header.className = 'code-header';
    header.innerHTML = `
      <span class="code-dot dot-red"></span>
      <span class="code-dot dot-yellow"></span>
      <span class="code-dot dot-green"></span>
      <span class="code-filename">find_the_bug</span>
    `;
    container.appendChild(header);

    const body = document.createElement('div');
    body.className = 'code-body';

    data.lines.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'code-line';
      lineEl.innerHTML = `
        <span class="line-num">${idx + 1}</span>
        <span class="line-content">${highlightSyntax(line.text)}</span>
      `;

      lineEl.addEventListener('click', () => {
        if (gameState.isChallengeLocked || !gameState.isPlaying) return;
        gameState.isChallengeLocked = true;
        if (dom.body) dom.body.style.pointerEvents = 'none';

        if (line.isBug) {
          gameState.bugsSquashed++;
          lineEl.classList.add('is-correct');
          onCorrectAnswer('BUG SQUASHED!');
        } else {
          lineEl.classList.add('is-wrong');
          const bugIdx = data.lines.findIndex(l => l.isBug);
          if (body.children[bugIdx]) body.children[bugIdx].classList.add('is-reveal');
          onWrongAnswer(5, 'WRONG LINE!');
        }
      });

      body.appendChild(lineEl);
    });

    container.appendChild(body);
    if (dom.body) dom.body.appendChild(container);

    // 50:50 for bug hunts: dim half of the innocent lines
    gameState.hint = () => {
      if (gameState.isChallengeLocked) return false;
      const innocent = [...body.children].filter((el, i) => !data.lines[i].isBug && !el.classList.contains('is-dimmed'));
      if (innocent.length < 2) return false;
      shuffle(innocent).slice(0, Math.floor(innocent.length / 2)).forEach(el => el.classList.add('is-dimmed'));
      return true;
    };
  }

  // RENDERER: Reaction Grid
  function renderReaction(data) {
    if (dom.tag && window.getIconHTML) dom.tag.innerHTML = `${window.getIconHTML(data.icon || 'zap', 14)} <span>${data.title}</span>`;
    if (dom.instruction) dom.instruction.textContent = data.instruction;

    const grid = document.createElement('div');
    grid.className = 'reaction-grid';

    const targetIdx = Math.floor(Math.random() * data.gridSize);
    const dots = [];

    for (let i = 0; i < data.gridSize; i++) {
      const dot = document.createElement('button');
      const isTarget = i === targetIdx;
      dot.className = `reaction-dot ${isTarget ? data.targetColor : data.decoyColor}`;

      dot.addEventListener('click', () => {
        if (gameState.isChallengeLocked || !gameState.isPlaying) return;
        gameState.isChallengeLocked = true;
        if (dom.body) dom.body.style.pointerEvents = 'none';

        if (isTarget) {
          dot.style.transform = 'scale(1.3)';
          onCorrectAnswer('FAST REFLEX!');
        } else {
          dot.style.opacity = '0.3';
          if (dots[targetIdx]) dots[targetIdx].style.transform = 'scale(1.25)';
          onWrongAnswer(3, 'WRONG TARGET!');
        }
      });

      dots.push(dot);
      grid.appendChild(dot);
    }

    if (dom.body) dom.body.appendChild(grid);
  }

  // RENDERER: Code Sequence
  function renderCodeSequence(data) {
    if (dom.tag && window.getIconHTML) dom.tag.innerHTML = `${window.getIconHTML(data.icon || 'layers', 14)} <span>${data.title}</span>`;
    if (dom.instruction) dom.instruction.textContent = data.instruction;

    const stepsBox = document.createElement('div');
    stepsBox.className = 'code-container';
    stepsBox.style.padding = '0.8rem 1rem';
    stepsBox.style.fontFamily = 'var(--font-mono)';
    stepsBox.style.fontSize = '0.9rem';
    stepsBox.style.lineHeight = '1.6';

    data.steps.forEach(step => {
      const row = document.createElement('div');
      if (step.includes('______')) { row.style.background = 'rgba(255, 111, 174, 0.28)'; row.style.borderRadius = '6px'; row.style.padding = '0 0.3rem'; }
      row.textContent = step;
      stepsBox.appendChild(row);
    });

    if (dom.body) dom.body.appendChild(stepsBox);

    const grid = document.createElement('div');
    grid.className = 'choices-grid';

    data.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (gameState.isChallengeLocked || !gameState.isPlaying) return;
        gameState.isChallengeLocked = true;
        if (dom.body) dom.body.style.pointerEvents = 'none';

        if (idx === data.correct) {
          btn.classList.add('is-correct');
          onCorrectAnswer('NAILED IT!');
        } else {
          btn.classList.add('is-wrong');
          if (grid.children[data.correct]) grid.children[data.correct].classList.add('is-reveal');
          onWrongAnswer(5, 'NOT QUITE!');
        }
      });

      grid.appendChild(btn);
    });

    if (dom.body) dom.body.appendChild(grid);
    gameState.hint = choiceHint(grid, data.correct);
  }

  // RENDERER: Imposter Snippet
  function renderImposter(data) {
    if (dom.tag && window.getIconHTML) dom.tag.innerHTML = `${window.getIconHTML(data.icon || 'shield-alert', 14)} <span>${data.title}</span>`;
    if (dom.instruction) dom.instruction.textContent = data.instruction;

    const grid = document.createElement('div');
    grid.className = 'imposter-grid';

    data.options.forEach(opt => {
      const card = document.createElement('div');
      card.className = 'imposter-card';
      card.innerHTML = `<code class="imposter-code-text">${highlightSyntax(opt.code)}</code>`;

      card.addEventListener('click', () => {
        if (gameState.isChallengeLocked || !gameState.isPlaying) return;
        gameState.isChallengeLocked = true;
        if (dom.body) dom.body.style.pointerEvents = 'none';

        if (opt.isImposter) {
          card.classList.add('is-correct');
          onCorrectAnswer('IMPOSTER CAUGHT!');
        } else {
          card.classList.add('is-wrong');
          const impIdx = data.options.findIndex(o => o.isImposter);
          if (grid.children[impIdx]) grid.children[impIdx].classList.add('is-reveal');
          onWrongAnswer(5, 'THAT ONE IS FINE!');
        }
      });

      grid.appendChild(card);
    });

    if (dom.body) dom.body.appendChild(grid);
    gameState.hint = choiceHint(grid, data.options.findIndex(o => o.isImposter));
  }

  // RENDERER: Network / Web Logic
  function renderNetworkWeb(data) {
    if (dom.tag && window.getIconHTML) dom.tag.innerHTML = `${window.getIconHTML(data.icon || 'globe', 14)} <span>${data.title}</span>`;
    if (dom.instruction) dom.instruction.textContent = data.instruction;

    if (data.diagram) {
      const diag = document.createElement('div');
      diag.className = 'flow-diagram-container';
      data.diagram.forEach(item => {
        const el = document.createElement('div');
        if (item === '↓') {
          el.className = 'flow-arrow';
          el.textContent = '↓';
        } else {
          el.className = `flow-node ${item.includes('CLIENT') ? 'client' : item.includes('SERVER') ? 'server' : 'question'}`;
          el.textContent = item;
        }
        diag.appendChild(el);
      });
      if (dom.body) dom.body.appendChild(diag);
    }

    const grid = document.createElement('div');
    grid.className = 'choices-grid';

    data.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt;

      btn.addEventListener('click', () => {
        if (gameState.isChallengeLocked || !gameState.isPlaying) return;
        gameState.isChallengeLocked = true;
        if (dom.body) dom.body.style.pointerEvents = 'none';

        if (idx === data.correct) {
          btn.classList.add('is-correct');
          onCorrectAnswer('CORRECT!');
        } else {
          btn.classList.add('is-wrong');
          if (grid.children[data.correct]) grid.children[data.correct].classList.add('is-reveal');
          onWrongAnswer(5, 'WRONG ANSWER!');
        }
      });

      grid.appendChild(btn);
    });

    if (dom.body) dom.body.appendChild(grid);
    gameState.hint = choiceHint(grid, data.correct);
  }

  // RENDERER: Psychological "DON'T CLICK" Trap
  function renderDontClick(data) {
    if (dom.tag && window.getIconHTML) dom.tag.innerHTML = `${window.getIconHTML(data.icon || 'alert-triangle', 14)} <span>${data.title}</span>`;
    if (dom.instruction) dom.instruction.textContent = data.instruction;

    const container = document.createElement('div');
    container.className = 'trap-btn-container';

    const btn = document.createElement('button');
    btn.className = 'trap-btn';
    btn.innerHTML = `
      <i data-lucide="alert-triangle" style="width: 28px; height: 28px;"></i>
      <span>DO NOT CLICK</span>
    `;

    let survived = true;

    btn.addEventListener('click', () => {
      if (gameState.isChallengeLocked || !gameState.isPlaying) return;
      gameState.isChallengeLocked = true;
      if (dom.body) dom.body.style.pointerEvents = 'none';

      survived = false;
      onWrongAnswer(10, 'YOU PRESSED IT! (-10 pts)');
    });

    container.appendChild(btn);
    if (dom.body) dom.body.appendChild(container);

    setTimeout(() => {
      if (gameState.isPlaying && survived && gameState.activeChallenge && gameState.activeChallenge.type === 'dont_click') {
        if (!gameState.isChallengeLocked) {
          gameState.isChallengeLocked = true;
          if (dom.body) dom.body.style.pointerEvents = 'none';
          onCorrectAnswer('IRON WILL!');
        }
      }
    }, data.duration);
  }

  // RENDERER: Memory Flash
  function renderMemoryFlash(data) {
    if (dom.tag && window.getIconHTML) dom.tag.innerHTML = `${window.getIconHTML(data.icon || 'brain', 14)} <span>${data.title}</span>`;
    if (dom.instruction) dom.instruction.textContent = data.instruction;

    const flashCard = document.createElement('div');
    flashCard.className = 'memory-flash-card';

    data.sequence.forEach(item => {
      const token = document.createElement('div');
      token.className = 'memory-token';
      token.textContent = item;
      flashCard.appendChild(token);
    });

    if (dom.body) dom.body.appendChild(flashCard);

    setTimeout(() => {
      if (!gameState.isPlaying) return;
      flashCard.innerHTML = `<span style="font-family: var(--font-display); font-size: 1.6rem; line-height: 1.2; padding: 0 0.4rem; background: rgba(255, 225, 77, 0.55); border-radius: 6px;">${data.question}</span>`;

      const grid = document.createElement('div');
      grid.className = 'choices-grid';

      data.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = opt;

        btn.addEventListener('click', () => {
          if (gameState.isChallengeLocked || !gameState.isPlaying) return;
          gameState.isChallengeLocked = true;
          if (dom.body) dom.body.style.pointerEvents = 'none';

          if (idx === data.correct) {
            btn.classList.add('is-correct');
            onCorrectAnswer('MEMORY MASTER!');
          } else {
            btn.classList.add('is-wrong');
            if (grid.children[data.correct]) grid.children[data.correct].classList.add('is-reveal');
            onWrongAnswer(5, 'FORGOT IT!');
          }
        });

        grid.appendChild(btn);
      });

      if (dom.body) dom.body.appendChild(grid);
      gameState.hint = choiceHint(grid, data.correct);
    }, data.flashDuration);
  }

  // Single-pass syntax highlighter for the Python / SQL snippets (HTML-escaped first, strings win over keywords)
  function highlightSyntax(code) {
    if (!code) return '';
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const tokenRegex = /(\/\/.*$|#.*$)|("[^"\n]*"|'[^'\n]*')|(\b(?:def|return|if|elif|else|for|while|in|and|or|not|import|from|as|pass|break|continue|class|const|let|var|function|SELECT|FROM|WHERE|ORDER|GROUP|BY|HAVING|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|ON|DISTINCT|LIMIT|ASC|DESC|COUNT|MAX|MIN|AVG|SUM)\b)|(\b(?:True|False|None|true|false|null|undefined)\b)|(\b\d+(?:\.\d+)?\b)|(\b(?:print|input|len|range|type|int|str|float|sorted|append|sort)\b(?=\())/gm;

    return escaped.replace(tokenRegex, (match, comment, str, kw, bool, num, fn) => {
      if (comment) return `<span class="tok-comment">${comment}</span>`;
      if (str) return `<span class="tok-str">${str}</span>`;
      if (kw) return `<span class="tok-kw">${kw}</span>`;
      if (bool) return `<span class="tok-bool">${bool}</span>`;
      if (num) return `<span class="tok-num">${num}</span>`;
      if (fn) return `<span class="tok-prop">${fn}</span>`;
      return match;
    });
  }

  // Compact Mobile Leaderboard Renderer
  function renderPlayerMobileLeaderboard(list) {
    const lbList = document.getElementById('player-mobile-lb-list');
    const lbCount = document.getElementById('player-mobile-lb-count');
    if (!lbList) return;

    const total = list ? list.length : 0;
    if (lbCount) {
      lbCount.textContent = `${total} Player${total === 1 ? '' : 's'}`;
    }

    if (!list || list.length === 0) {
      lbList.innerHTML = '<div class="mini-lb-empty">Waiting for scores...</div>';
      return;
    }

    const frag = document.createDocumentFragment();

    const myIdx = list.findIndex(e => e.id === clientId);
    const visible = list.slice(0, 10).map((entry, idx) => ({ entry, idx }));
    if (myIdx >= 10) visible.push({ entry: list[myIdx], idx: myIdx });

    visible.forEach(({ entry, idx }) => {
      const isMe = entry.id === clientId;
      const rank = idx + 1;
      const row = document.createElement('div');
      row.className = `mini-lb-row${isMe ? ' me' : ''}`;

      if (isMe) {
        const rVal = document.getElementById('final-rank-val');
        if (rVal) rVal.textContent = `#${rank}`;
      }

      const avatar = window.renderAvatarHTML ? window.renderAvatarHTML(entry.avatar, 26) : '<span></span>';
      row.innerHTML = `
        <span class="mini-lb-rank">#${rank}</span>
        ${avatar}
        <span class="mini-lb-name">${entry.name}${isMe ? ' <span class="mini-lb-you">(you)</span>' : ''}</span>
        <span class="mini-lb-score">${(entry.score || 0).toLocaleString()}<small>PTS</small></span>
      `;
      frag.appendChild(row);
    });

    lbList.innerHTML = '';
    lbList.appendChild(frag);
  }

  // Kicked by Moderator Notification Handler
  if (socket) {
    socket.on('player_kicked', (data) => {
      clearInterval(gameState.timerInterval);
      gameState.isPlaying = false;
      alert((data && data.message) || 'Your session was removed by a workshop moderator.');
      localStorage.removeItem('debugged_has_completed');
      window.location.reload();
    });

    socket.on('leaderboard_update', (data) => {
      if (data && data.leaderboard) renderPlayerMobileLeaderboard(data.leaderboard);
    });

    socket.on('leaderboard_sync', (data) => {
      if (data && data.leaderboard) renderPlayerMobileLeaderboard(data.leaderboard);
      const lobbyCount = document.getElementById('lobby-count');
      if (lobbyCount && data && typeof data.lobbyCount === 'number') lobbyCount.textContent = data.lobbyCount;
    });

    socket.on('connect', () => {
      // Only re-register a device that already joined (e.g. after a Wi-Fi blip)
      if (gameState.joined && gameState.playerName) {
        socket.emit('player_join', { name: gameState.playerName, avatar: gameState.playerAvatar, clientId });
      }
    });

    socket.on('round_state', (info) => applyRoundInfo(info));

    socket.on('player_init', (data) => {
      if (data && data.round) applyRoundInfo(data.round);
      if (!gameState.pendingJoin) {
        if (gameState.joined && !gameState.isPlaying && (gameState.inLobby || gameState.waitingNext) && data) enterLobby(data.status);
        return;
      }
      gameState.pendingJoin = false;
      clearTimeout(joinTimeout);
      gameState.joined = true;
      if (data && data.round && data.round.mode === 'group') enterLobby(data.status);
      else startFreeRound();
    });

    socket.on('join_rejected', (data) => {
      gameState.pendingJoin = false;
      clearTimeout(joinTimeout);
      gameState.joined = false;
      showScreen('welcome');
      const uErr = document.getElementById('username-error');
      if (uErr) {
        uErr.textContent = (data && data.message) || 'You cannot join right now.';
        uErr.classList.add('active');
      }
      if (window.soundEngine) window.soundEngine.playError();
    });

    socket.on('ready_ack', (data) => {
      if (data && data.round) applyRoundInfo(data.round);
      if (data && !gameState.isPlaying) enterLobby(data.status === 'lobby' ? 'lobby' : 'waiting');
    });
  }

  ['fifty', 'skip', 'time'].forEach((kind) => {
    const btn = document.getElementById(`ll-${kind}`);
    if (btn) btn.addEventListener('click', () => useLifeline(kind));
  });

  // Testing hook (only when the page is opened with ?debug=1)
  if (/[?&]debug=1/.test(location.search)) {
    window.__debug = {
      state: gameState,
      show(type, id) {
        const item = (window.CHALLENGE_ENGINE[type] || []).find(q => q.id === id);
        if (item) nextChallenge({ type, id: item.id, tier: item.tier, data: JSON.parse(JSON.stringify(item)) });
      },
      grant: grantLifeline,
      setTimeLeft(sec) { gameState.endAt = Date.now() + sec * 1000; }
    };
  }

  // Session State Initialization
  function initSessionState() {
    initAvatarPicker();
    initInputListeners();

    const hasCompleted = localStorage.getItem('debugged_has_completed') === 'true';
    const savedName = localStorage.getItem('debugged_name');

    if (hasCompleted && savedName) {
      gameState.playerName = savedName;
      gameState.playerAvatar = localStorage.getItem('debugged_avatar') || 'peep_1';
      gameState.score = parseInt(localStorage.getItem('debugged_last_score') || '0', 10);
      
      const fScore = document.getElementById('final-score-num');
      if (fScore) fScore.textContent = gameState.score.toLocaleString();

      const lastIcon = localStorage.getItem('debugged_last_tier_icon') || 'terminal';
      const lastTitle = localStorage.getItem('debugged_last_tier_title') || 'SCRIPT KIDDIE';
      
      const fIcon = document.getElementById('final-tier-icon');
      if (fIcon && window.getIconHTML) fIcon.innerHTML = window.getIconHTML(lastIcon, 16);

      const fTitle = document.getElementById('final-tier-title');
      if (fTitle) fTitle.textContent = lastTitle;

      const fCombo = document.getElementById('final-max-combo');
      if (fCombo) fCombo.textContent = `x${localStorage.getItem('debugged_last_combo') || 1}`;

      const fAcc = document.getElementById('final-accuracy');
      if (fAcc) fAcc.textContent = `${localStorage.getItem('debugged_last_accuracy') || 100}%`;

      const fBugs = document.getElementById('final-bugs-fixed');
      if (fBugs) fBugs.textContent = localStorage.getItem('debugged_last_bugs') || 0;

      showScreen('gameover');
    } else {
      showScreen('welcome');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSessionState();
      if (window.refreshIcons) window.refreshIcons();
    });
  } else {
    initSessionState();
    if (window.refreshIcons) window.refreshIcons();
  }

})();
