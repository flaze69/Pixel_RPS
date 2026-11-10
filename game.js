/* =========================================================================
   PIXEL RPS DUEL - 8-BIT RETRO GAME ENGINE
   - Web Audio 8-bit Synth (zero asset dependencies)
   - Telegram WebApp SDK & Haptics
   - PeerJS WebRTC P2P Multiplayer (2-Player Real-time sync)
   - Singleplayer VS Bot + 1-Phone Hotseat
   ========================================================================= */

// --- 8-BIT AUDIO SYNTH (Web Audio API) ---
class PixelSound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playTone(freq, type, duration, endFreq = null) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  }

  btnClick() {
    this.playTone(520, 'square', 0.05, 300);
  }

  countdown() {
    this.playTone(440, 'square', 0.08);
  }

  fight() {
    this.playTone(880, 'square', 0.2);
  }

  hit() {
    this.playTone(180, 'sawtooth', 0.25, 40);
  }

  tie() {
    this.playTone(300, 'triangle', 0.2, 200);
  }

  win() {
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'square', 0.15), idx * 120);
    });
  }

  lose() {
    const notes = [300, 260, 220, 180];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 'sawtooth', 0.15), idx * 120);
    });
  }
}

const sound = new PixelSound();

// --- TELEGRAM WEBAPP INTEGRATION ---
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

function triggerHaptic(type = 'light') {
  if (tg?.HapticFeedback) {
    if (type === 'heavy') tg.HapticFeedback.impactOccurred('heavy');
    else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
    else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    else tg.HapticFeedback.impactOccurred('light');
  }
}

// --- PIXEL ICONS DEFINITIONS ---
const PIXEL_SVGS = {
  rock: `
    <svg viewBox="0 0 16 16" class="pixel-hand-svg">
      <rect x="5" y="2" width="6" height="2" fill="#fff" />
      <rect x="3" y="4" width="10" height="2" fill="#fff" />
      <rect x="2" y="6" width="12" height="6" fill="#f1e05a" />
      <rect x="3" y="12" width="10" height="2" fill="#fff" />
      <rect x="4" y="6" width="2" height="4" fill="#30363d" />
      <rect x="7" y="6" width="2" height="4" fill="#30363d" />
      <rect x="10" y="6" width="2" height="4" fill="#30363d" />
    </svg>`,
  paper: `
    <svg viewBox="0 0 16 16" class="pixel-hand-svg">
      <rect x="3" y="2" width="2" height="6" fill="#bc8cff" />
      <rect x="6" y="1" width="2" height="7" fill="#bc8cff" />
      <rect x="9" y="1" width="2" height="7" fill="#bc8cff" />
      <rect x="12" y="3" width="2" height="5" fill="#bc8cff" />
      <rect x="1" y="6" width="2" height="4" fill="#bc8cff" />
      <rect x="3" y="8" width="11" height="5" fill="#fff" />
      <rect x="4" y="13" width="9" height="2" fill="#30363d" />
    </svg>`,
  scissors: `
    <svg viewBox="0 0 16 16" class="pixel-hand-svg">
      <rect x="3" y="1" width="2" height="6" fill="#3fb950" />
      <rect x="7" y="1" width="2" height="6" fill="#3fb950" />
      <rect x="3" y="7" width="6" height="3" fill="#fff" />
      <rect x="1" y="10" width="4" height="4" fill="#3fb950" />
      <rect x="7" y="10" width="4" height="4" fill="#3fb950" />
      <rect x="2" y="11" width="2" height="2" fill="#0d1117" />
      <rect x="8" y="11" width="2" height="2" fill="#0d1117" />
    </svg>`,
  question: `
    <svg viewBox="0 0 16 16" class="pixel-hand-svg">
      <rect x="5" y="2" width="6" height="2" fill="#58a6ff" />
      <rect x="9" y="4" width="2" height="3" fill="#58a6ff" />
      <rect x="6" y="7" width="3" height="3" fill="#58a6ff" />
      <rect x="6" y="12" width="3" height="2" fill="#58a6ff" />
    </svg>`
};

// --- GAME STATE ---
const STATE = {
  mode: 'bot', // 'bot', 'hotseat', 'online'
  round: 1,
  maxLives: 3,
  p1Lives: 3,
  p2Lives: 3,
  p1Choice: null,
  p2Choice: null,
  isHost: true,
  isTurnP1: true, // for hotseat
  peer: null,
  conn: null,
  roomCode: '',
  stars: 100
};

// --- DOM ELEMENTS ---
const screens = {
  menu: document.getElementById('screenMenu'),
  lobby: document.getElementById('screenLobby'),
  battle: document.getElementById('screenBattle'),
  gameOver: document.getElementById('screenGameOver')
};

const dom = {
  app: document.getElementById('gameApp'),
  crtOverlay: document.getElementById('crtOverlay'),
  soundBtn: document.getElementById('soundBtn'),
  crtBtn: document.getElementById('crtBtn'),
  starsBalance: document.getElementById('starsBalance'),
  p1Label: document.getElementById('p1Label'),
  p2Label: document.getElementById('p2Label'),
  p1Hearts: document.getElementById('p1Hearts'),
  p2Hearts: document.getElementById('p2Hearts'),
  roundIndicator: document.getElementById('roundIndicator'),
  slotP1: document.getElementById('slotP1'),
  slotP2: document.getElementById('slotP2'),
  iconP1: document.getElementById('iconP1'),
  iconP2: document.getElementById('iconP2'),
  clashEffect: document.getElementById('clashEffect'),
  battleStatus: document.getElementById('battleStatus'),
  controlsPanel: document.getElementById('controlsPanel'),
  btnSurrender: document.getElementById('btnSurrender'),
  btnRematch: document.getElementById('btnRematch'),
  btnMenuFromEnd: document.getElementById('btnMenuFromEnd'),
  endWinnerTitle: document.getElementById('endWinnerTitle'),
  endWinnerSub: document.getElementById('endWinnerSub'),
  starsRewardBox: document.getElementById('starsRewardBox'),
  // Lobby
  btnCreateRoom: document.getElementById('btnCreateRoom'),
  roomCodeDisplay: document.getElementById('roomCodeDisplay'),
  generatedRoomCode: document.getElementById('generatedRoomCode'),
  btnCopyInvite: document.getElementById('btnCopyInvite'),
  inputRoomCode: document.getElementById('inputRoomCode'),
  btnJoinRoom: document.getElementById('btnJoinRoom'),
  btnBackFromLobby: document.getElementById('btnBackFromLobby')
};

// --- NAVIGATION ---
function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenName].classList.add('active');
  sound.btnClick();
  triggerHaptic('light');
}

// --- UTILITIES ---
function renderHearts(count) {
  let str = '';
  for (let i = 0; i < STATE.maxLives; i++) {
    str += i < count ? '❤️' : '🖤';
  }
  return str;
}

function updateScoreboard() {
  dom.p1Hearts.innerText = renderHearts(STATE.p1Lives);
  dom.p2Hearts.innerText = renderHearts(STATE.p2Lives);
  dom.roundIndicator.innerText = `РАУНД ${STATE.round}`;
}

// Check who beats whom
// Rock (0) beats Scissors (2)
// Paper (1) beats Rock (0)
// Scissors (2) beats Paper (1)
function evaluateRound(c1, c2) {
  if (c1 === c2) return 0; // Tie
  if (
    (c1 === 'rock' && c2 === 'scissors') ||
    (c1 === 'scissors' && c2 === 'paper') ||
    (c1 === 'paper' && c2 === 'rock')
  ) {
    return 1; // P1 wins
  }
  return 2; // P2 wins
}

// --- START MATCH ---
function startNewMatch(mode) {
  STATE.mode = mode;
  STATE.round = 1;
  STATE.p1Lives = STATE.maxLives;
  STATE.p2Lives = STATE.maxLives;
  STATE.p1Choice = null;
  STATE.p2Choice = null;
  STATE.isTurnP1 = true;

  if (mode === 'bot') {
    dom.p1Label.innerText = 'ТИ';
    dom.p2Label.innerText = 'BOT';
  } else if (mode === 'hotseat') {
    dom.p1Label.innerText = 'ГРАВЕЦЬ 1';
    dom.p2Label.innerText = 'ГРАВЕЦЬ 2';
  } else if (mode === 'online') {
    dom.p1Label.innerText = STATE.isHost ? 'ТИ (ХОСТ)' : 'ТИ';
    dom.p2Label.innerText = STATE.isHost ? 'СУПЕРНИК' : 'ХОСТ';
  }

  updateScoreboard();
  showScreen('battle');
  startRound();
}

function startRound() {
  STATE.p1Choice = null;
  STATE.p2Choice = null;

  dom.iconP1.innerHTML = PIXEL_SVGS.question;
  dom.iconP2.innerHTML = PIXEL_SVGS.question;
  dom.slotP1.classList.remove('active', 'punch');
  dom.slotP2.classList.remove('active', 'punch');
  dom.clashEffect.style.display = 'none';

  setControlsEnabled(true);

  if (STATE.mode === 'hotseat') {
    STATE.isTurnP1 = true;
    dom.battleStatus.innerText = 'ГРАВЕЦЬ 1: ОБЕРИ ЗБРОЮ!';
  } else if (STATE.mode === 'online') {
    dom.battleStatus.innerText = 'ОБИРАЙ СВІЙ ХІД!';
  } else {
    dom.battleStatus.innerText = 'ТВІЙ ХІД! КАМІНЬ, НОЖИЦІ, ПАПІР?';
  }
}

function setControlsEnabled(enabled) {
  const btns = dom.controlsPanel.querySelectorAll('.choice-btn');
  btns.forEach(b => b.disabled = !enabled);
}

// --- PLAYER INPUT HANDLING ---
dom.controlsPanel.addEventListener('click', (e) => {
  const btn = e.target.closest('.choice-btn');
  if (!btn || btn.disabled) return;

  const choice = btn.dataset.choice;
  sound.btnClick();
  triggerHaptic('light');

  if (STATE.mode === 'bot') {
    STATE.p1Choice = choice;
    setControlsEnabled(false);
    dom.iconP1.innerHTML = PIXEL_SVGS[choice];
    dom.slotP1.classList.add('active');
    dom.battleStatus.innerText = 'БОТ РОЗДУМУЄ...';

    // Bot chooses with slight delay
    setTimeout(() => {
      const choices = ['rock', 'paper', 'scissors'];
      STATE.p2Choice = choices[Math.floor(Math.random() * choices.length)];
      dom.iconP2.innerHTML = PIXEL_SVGS[STATE.p2Choice];
      dom.slotP2.classList.add('active');
      triggerClash();
    }, 600);

  } else if (STATE.mode === 'hotseat') {
    if (STATE.isTurnP1) {
      STATE.p1Choice = choice;
      STATE.isTurnP1 = false;
      dom.slotP1.classList.add('active');
      setControlsEnabled(false);
      dom.battleStatus.innerText = 'ХІД ЗБЕРЕЖЕНО! ПЕРЕДАЙ ТЕЛЕФОН ГРАВЦЮ 2!';

      setTimeout(() => {
        setControlsEnabled(true);
        dom.battleStatus.innerText = 'ГРАВЕЦЬ 2: ОБЕРИ ЗБРОЮ!';
      }, 900);
    } else {
      STATE.p2Choice = choice;
      setControlsEnabled(false);
      dom.slotP2.classList.add('active');
      triggerClash();
    }

  } else if (STATE.mode === 'online') {
    // Send choice over PeerJS
    setControlsEnabled(false);
    const myChoice = choice;
    dom.battleStatus.innerText = 'ХІД ЗРОБЛЕНО! ОЧІКУВАННЯ СУПЕРНИКА...';

    if (STATE.isHost) {
      STATE.p1Choice = myChoice;
      dom.slotP1.classList.add('active');
      if (STATE.conn) {
        STATE.conn.send({ type: 'move_locked' });
      }
      checkOnlineClash();
    } else {
      STATE.p2Choice = myChoice;
      dom.slotP2.classList.add('active');
      if (STATE.conn) {
        STATE.conn.send({ type: 'submit_move', choice: myChoice });
      }
    }
  }
});

// --- CLASH ANIMATION & RESOLUTION ---
function triggerClash() {
  sound.fight();
  triggerHaptic('heavy');

  dom.battleStatus.innerText = '3... 2... 1... БІЙ!';
  dom.slotP1.classList.add('punch');
  dom.slotP2.classList.add('punch');
  dom.clashEffect.style.display = 'block';
  dom.app.classList.add('shaking');

  setTimeout(() => {
    dom.app.classList.remove('shaking');
    dom.iconP1.innerHTML = PIXEL_SVGS[STATE.p1Choice];
    dom.iconP2.innerHTML = PIXEL_SVGS[STATE.p2Choice];

    const result = evaluateRound(STATE.p1Choice, STATE.p2Choice);

    if (result === 0) {
      sound.tie();
      dom.battleStatus.innerText = '⚡ НІЧИЯ! БЕЗ ВТРАТ!';
    } else if (result === 1) {
      sound.hit();
      triggerHaptic('error');
      STATE.p2Lives--;
      const p1Name = STATE.mode === 'hotseat' ? 'ГРАВЕЦЬ 1' : 'ТИ';
      dom.battleStatus.innerText = `💥 ${p1Name} ЗАВДАЄ УДАРУ!`;
    } else {
      sound.hit();
      triggerHaptic('error');
      STATE.p1Lives--;
      const p2Name = STATE.mode === 'bot' ? 'БОТ' : (STATE.mode === 'hotseat' ? 'ГРАВЕЦЬ 2' : 'СУПЕРНИК');
      dom.battleStatus.innerText = `💥 ${p2Name} ЗАВДАЄ УДАРУ!`;
    }

    updateScoreboard();

    // Check match over
    setTimeout(() => {
      if (STATE.p1Lives <= 0 || STATE.p2Lives <= 0) {
        finishMatch();
      } else {
        STATE.round++;
        dom.roundIndicator.innerText = `РАУНД ${STATE.round}`;
        startRound();
      }
    }, 1800);
  }, 400);
}

// --- FINISH MATCH ---
function finishMatch() {
  const p1Won = STATE.p1Lives > 0;
  let title = '';
  let sub = '';

  if (STATE.mode === 'bot') {
    if (p1Won) {
      sound.win();
      triggerHaptic('success');
      title = 'ТИ ПЕРЕМІГ БОТА! 🏆';
      sub = 'Твої рефлекси справжнього ретро-чемпіона!';
      STATE.stars += 20;
      dom.starsBalance.innerText = `${STATE.stars} STARS`;
      dom.starsRewardBox.style.display = 'block';
    } else {
      sound.lose();
      triggerHaptic('error');
      title = 'БОТ ПЕРЕМІГ! 💀';
      sub = 'Спробуй реванш та відіграйся!';
      dom.starsRewardBox.style.display = 'none';
    }
  } else if (STATE.mode === 'hotseat') {
    sound.win();
    title = p1Won ? 'ГРАВЕЦЬ 1 ПЕРЕМІГ! 👑' : 'ГРАВЕЦЬ 2 ПЕРЕМІГ! 👑';
    sub = 'Неймовірна дуель на одному екрані!';
    dom.starsRewardBox.style.display = 'none';
  } else if (STATE.mode === 'online') {
    const iWon = (STATE.isHost && p1Won) || (!STATE.isHost && !p1Won);
    if (iWon) {
      sound.win();
      triggerHaptic('success');
      title = 'ПЕРЕМОГА В ОНЛАЙН ДУЕЛІ! 🌟';
      sub = 'Ти забрав банку очок супротивника!';
      STATE.stars += 50;
      dom.starsBalance.innerText = `${STATE.stars} STARS`;
      dom.starsRewardBox.style.display = 'block';
    } else {
      sound.lose();
      triggerHaptic('error');
      title = 'ПОРАЗКА В ДУЕЛІ! ⚔️';
      sub = 'Суперник виявився спритнішим!';
      dom.starsRewardBox.style.display = 'none';
    }
  }

  dom.endWinnerTitle.innerText = title;
  dom.endWinnerSub.innerText = sub;
  showScreen('gameOver');
}

// --- PEERJS MULTIPLAYER LOGIC ---
function initPeerHost() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  STATE.roomCode = code;
  STATE.isHost = true;

  dom.generatedRoomCode.innerText = code;
  dom.roomCodeDisplay.style.display = 'block';

  try {
    const peerId = 'rps_' + code;
    STATE.peer = new Peer(peerId, { debug: 1 });

    STATE.peer.on('open', (id) => {
      console.log('Host Peer open:', id);
    });

    STATE.peer.on('connection', (conn) => {
      STATE.conn = conn;
      setupConnectionHandlers();
      // Inform guest
      conn.on('open', () => {
        conn.send({ type: 'welcome', room: code });
        startNewMatch('online');
      });
    });

    STATE.peer.on('error', (err) => {
      console.error('Peer error:', err);
      alert('Помилка мережі кімнати. Спробуйте ще раз.');
    });
  } catch (e) {
    console.error(e);
  }
}

function joinPeerRoom(code) {
  if (!code) return;
  STATE.roomCode = code;
  STATE.isHost = false;

  try {
    STATE.peer = new Peer();
    STATE.peer.on('open', () => {
      const hostId = 'rps_' + code;
      const conn = STATE.peer.connect(hostId);
      STATE.conn = conn;
      setupConnectionHandlers();

      conn.on('open', () => {
        conn.send({ type: 'guest_joined' });
        startNewMatch('online');
      });
    });

    STATE.peer.on('error', (err) => {
      console.error('Peer join error:', err);
      alert('Не вдалося знайти кімнату ' + code);
    });
  } catch (e) {
    console.error(e);
  }
}

function setupConnectionHandlers() {
  if (!STATE.conn) return;

  STATE.conn.on('data', (data) => {
    console.log('Received P2P data:', data);

    if (data.type === 'move_locked') {
      dom.slotP1.classList.add('active');
      dom.battleStatus.innerText = 'ХОСТ ОБРАВ ХІД! ТВОРЯ ТЕРГА!';
    } else if (data.type === 'submit_move' && STATE.isHost) {
      STATE.p2Choice = data.choice;
      dom.slotP2.classList.add('active');
      checkOnlineClash();
    } else if (data.type === 'reveal_clash') {
      STATE.p1Choice = data.p1;
      STATE.p2Choice = data.p2;
      triggerClash();
    } else if (data.type === 'rematch_req') {
      startNewMatch('online');
    }
  });

  STATE.conn.on('close', () => {
    alert('Суперник відключився від дуелі');
    showScreen('menu');
  });
}

function checkOnlineClash() {
  if (STATE.isHost && STATE.p1Choice && STATE.p2Choice) {
    // Host broadcasts reveal to guest
    STATE.conn.send({
      type: 'reveal_clash',
      p1: STATE.p1Choice,
      p2: STATE.p2Choice
    });
    triggerClash();
  }
}

// --- BUTTON LISTENERS ---
document.getElementById('btnVsBot').addEventListener('click', () => startNewMatch('bot'));
document.getElementById('btnHotseat').addEventListener('click', () => startNewMatch('hotseat'));
document.getElementById('btnOnline').addEventListener('click', () => showScreen('lobby'));

dom.btnCreateRoom.addEventListener('click', () => {
  sound.btnClick();
  initPeerHost();
});

dom.btnJoinRoom.addEventListener('click', () => {
  const code = dom.inputRoomCode.value.trim();
  if (code.length < 4) {
    alert('Введіть коректний код кімнати');
    return;
  }
  sound.btnClick();
  joinPeerRoom(code);
});

dom.btnCopyInvite.addEventListener('click', () => {
  const shareUrl = window.location.origin + window.location.pathname + '?room=' + STATE.roomCode;
  navigator.clipboard.writeText(shareUrl).then(() => {
    alert('Посилання скопійовано: ' + shareUrl);
  }).catch(() => {
    alert('Код кімнати: ' + STATE.roomCode);
  });
});

dom.btnBackFromLobby.addEventListener('click', () => showScreen('menu'));
dom.btnSurrender.addEventListener('click', () => showScreen('menu'));
dom.btnMenuFromEnd.addEventListener('click', () => showScreen('menu'));

dom.btnRematch.addEventListener('click', () => {
  sound.btnClick();
  if (STATE.mode === 'online' && STATE.conn) {
    STATE.conn.send({ type: 'rematch_req' });
  }
  startNewMatch(STATE.mode);
});

// Sound Toggle
dom.soundBtn.addEventListener('click', () => {
  sound.enabled = !sound.enabled;
  dom.soundBtn.innerText = sound.enabled ? '🔊 ON' : '🔇 OFF';
  sound.btnClick();
});

// CRT Toggle
dom.crtBtn.addEventListener('click', () => {
  const isActive = dom.crtOverlay.style.display !== 'none';
  dom.crtOverlay.style.display = isActive ? 'none' : 'block';
  dom.crtBtn.innerText = isActive ? '📺 NO CRT' : '📺 CRT';
  sound.btnClick();
});

// Auto-check URL query for room invite
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room') || (tg?.initDataUnsafe?.start_param);
  if (room) {
    showScreen('lobby');
    dom.inputRoomCode.value = room;
    joinPeerRoom(room);
  }
});
