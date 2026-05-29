// ── UI — Screen router + DOM rendering ───────────────────────────────────────

import { ROLES, PRESETS, makeRoleCard } from './roles.js';
import { PHASE, initState, getState, getPhase,
  applyPhaseChange, applyLobbyUpdate, applyMyRole,
  applyWolfTeam, applyAmorLink, applyVoteUpdate,
  applyVoteResult, applyElimination, applyGameOver,
  applyTimerSync, setPlayerConnected, resetState,
} from './state.js';
import {
  initNetwork, hostStart, playerJoin,
  broadcastToPlayers, sendToPlayer,
  disconnect, generateId, generateRoomCode,
  getConnectedPlayerIds,
  hostInitOfflineMode, hostOfflineCreateOffer, hostOfflineAcceptAnswer,
  playerOfflineAcceptOffer,
} from './network.js';
import { encodeSDP, decodeSDP } from './sdpcodec.js';
import { scanQR } from './qrscanner.js';
import {
  initHostGame, getHostState, hostAddPlayer, hostRemovePlayer,
  broadcastLobbyUpdate, assignRoles, hostSetPhase,
  hostReceiveNightAction, hostReceiveGunnerShoot,
  resolveNight, hostReceiveVote, resolveVote,
  checkWinConditions, getLog, getPresetForCount,
  hostResendPrivateState,
} from './host.js';
import {
  submitVote, submitGunnerShoot, submitHunterShoot,
  submitWolfKill, submitAlphaConvert, submitSeerCheck,
  submitAuraSeerCheck, submitBodyguardProtect,
  submitWitchHeal, submitWitchPoison, submitTrap,
  submitPriestBless, submitMediumCommune, submitAmorLink,
  isAlive, getMyPlayerRecord,
} from './player.js';
import { createTimer, formatTime } from './timer.js';
import { renderQR } from './qr.js';
import { initI18n, t, getLang, toggleLang, applyAllI18n, onLangChange } from './i18n.js';

// ── Globals ───────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
let _isHost = false;
let _myId = null;
let _myName = null;
let _roomCode = null;
let _wsUrl = null;
let _hostTimer = null;
let _gmPanelOpen = false;
let _seerPendingResult = null; // store until player confirms
let _hunterRetaliating = false;
let _selectedRoleIds = [];
let _offlineHostMode = false; // true if the host started via "Host Offline" instead of WiFi mode

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  applyAllI18n();
  bindLangToggle();
  onLangChange(() => {
    // Re-render any dynamic content that doesn't use data-i18n
    const state = getState();
    if (state?.myRole) {
      // Update the reveal screen text in place if user toggles while viewing it
      const photoEl = $('role-reveal-info');
      if (photoEl) showPrivateRoleReveal(state.myRole.id, /*skipScreenSwitch*/ true);
    }
    if (_isHost) renderGMPanel();
  });

  showIOSBannerIfNeeded();
  bindHome();
  bindHostSetup();
  bindPlayerJoin();
  bindGMPanel();

  initNetwork({
    onMessage:      handleMessage,
    onPlayerJoined: handleHostPlayerJoined,
    onPlayerLeft:   handleHostPlayerLeft,
    onConnected:    handlePlayerConnected,
    onDisconnected: handleDisconnected,
  });

  // Auto-join from URL param ?room=CODE
  const params = new URLSearchParams(location.search);
  const roomParam = params.get('room');
  if (roomParam) {
    showScreen('player-join');
    _roomCode = roomParam.toUpperCase();
    $('room-code-display').textContent = _roomCode;
    $('room-code-display-wrap').style.display = '';
    $('room-code-input').value = _roomCode;
    $('room-code-input').style.display = 'none';

    // If we have a stored session for this room, auto-rejoin
    const saved = loadSession();
    if (saved && saved.roomCode === _roomCode && saved.name) {
      $('player-name-input').value = saved.name;
      $('join-status').textContent = t('join_reconnect');
      setTimeout(() => doJoin(), 200);
    } else {
      $('player-name-input').focus();
    }
  } else {
    // No room param: still try to auto-rejoin if we have a saved session
    const saved = loadSession();
    if (saved && saved.roomCode && saved.name) {
      showScreen('player-join');
      _roomCode = saved.roomCode;
      $('room-code-input').value = _roomCode;
      $('player-name-input').value = saved.name;
      $('join-status').textContent = `${t('join_finding_old')} ${_roomCode}…`;
      setTimeout(() => doJoin(), 200);
    }
  }
});

// ── Session persistence (for reconnect after refresh) ────────────────────────

const SESSION_KEY = 'wolves-session';
function saveSession(roomCode, name) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, name, ts: Date.now() })); } catch (_) {}
}
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Expire after 6 hours so we don't auto-rejoin a dead room days later
    if (Date.now() - (s.ts || 0) > 6 * 60 * 60 * 1000) return null;
    return s;
  } catch (_) { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
}

// ── iOS Banner ────────────────────────────────────────────────────────────────

function showIOSBannerIfNeeded() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  if (isIOS && !isStandalone) {
    const banner = document.createElement('div');
    banner.className = 'ios-banner';
    banner.textContent = t('ios_banner');
    document.body.prepend(banner);
  }
}

function bindLangToggle() {
  $('lang-toggle')?.addEventListener('click', () => toggleLang());
}

// ── Screen Management ─────────────────────────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $('screen-' + id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

// ── Home ──────────────────────────────────────────────────────────────────────

function bindHome() {
  $('btn-create-room').addEventListener('click', startHostFlow);
  $('btn-join-room').addEventListener('click', () => showScreen('player-join'));
  $('btn-offline-host')?.addEventListener('click', startOfflineHostFlow);
  $('btn-offline-join')?.addEventListener('click', () => showScreen('offline-join'));
  detectWiFiServerMode();
}

// Probe /ip to see if a Node signaling server is available on this origin.
// If not (e.g. running on GitHub Pages), hide the WiFi-server buttons so users
// don't try a flow that can't possibly work.
async function detectWiFiServerMode() {
  try {
    const resp = await fetch('ip', { cache: 'no-store' });
    if (!resp.ok) throw new Error('no /ip');
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('json')) throw new Error('not json');
    // Server is present — keep the WiFi-server buttons visible
    return;
  } catch (_) {
    // No server → hide WiFi-mode buttons and the divider, promote offline mode
    $('btn-create-room')?.classList.add('hidden');
    $('btn-join-room')?.classList.add('hidden');
    // Hide the divider above the offline buttons (the only one with the "or" label)
    document.querySelectorAll('#screen-home [data-i18n="home_or"]').forEach(el => {
      el.parentElement?.classList.add('hidden');
    });
  }
}

// ── Host Setup ────────────────────────────────────────────────────────────────

function bindHostSetup() {
  $('btn-host-cancel').addEventListener('click', () => {
    disconnect();
    showScreen('home');
  });

  $('btn-start-game').addEventListener('click', startGame);
  $('btn-reveal-roles').addEventListener('click', dealRoles);

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.count);
      applyPreset(count);
    });
  });
}

async function startHostFlow() {
  _isHost = true;
  _myId = 'HOST';
  _offlineHostMode = false;
  _roomCode = generateRoomCode();

  showScreen('host-setup');
  $('btn-start-game').disabled = true;
  $('btn-reveal-roles').disabled = true;
  $('host-status').textContent = t('host_starting');
  $('host-room-code').textContent = _roomCode;

  try {
    const ipResp = await fetch('ip', { cache: 'no-store' });
    if (!ipResp.ok || !(ipResp.headers.get('content-type') || '').includes('json')) {
      throw new Error('No local server. Use “Host Offline (QR mode)” instead.');
    }
    const ipData = await ipResp.json();
    _wsUrl = `ws://${ipData.ip}:${ipData.port}`;
    const joinUrl = `http://${ipData.ip}:${ipData.port}?room=${_roomCode}`;

    renderQR($('host-qr-canvas'), joinUrl);
    $('host-status').textContent = t('host_waiting');

    initHostGame();
    initState(true, 'HOST', onStateChange);
    buildRoleSelector();
    applyPreset(9);

    await hostStart(_wsUrl, _roomCode);
  } catch (err) {
    $('host-status').textContent = '⚠️ ' + err.message;
  }
}

function buildRoleSelector() {
  const grid = $('role-selector-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const [id, role] of Object.entries(ROLES)) {
    const div = document.createElement('div');
    div.className = 'role-checkbox';
    div.dataset.roleId = id;
    div.innerHTML = `
      <div class="check-dot"></div>
      <span class="role-name-short">${role.nameVi}</span>
      <span class="role-count-badge" data-count-id="${id}">0</span>
    `;
    div.addEventListener('click', () => toggleRole(id));
    grid.appendChild(div);
  }
}

function toggleRole(roleId) {
  const idx = _selectedRoleIds.indexOf(roleId);
  if (idx === -1) {
    _selectedRoleIds.push(roleId);
  } else {
    _selectedRoleIds.splice(idx, 1);
  }
  updateRoleSelectorUI();
}

function applyPreset(count) {
  _selectedRoleIds = [...(PRESETS[count] || PRESETS[9])];
  updateRoleSelectorUI();

  document.querySelectorAll('.preset-btn').forEach(b =>
    b.classList.toggle('active', parseInt(b.dataset.count) === count)
  );
}

function updateRoleSelectorUI() {
  const counts = {};
  for (const id of _selectedRoleIds) counts[id] = (counts[id] || 0) + 1;

  document.querySelectorAll('.role-checkbox').forEach(el => {
    const id = el.dataset.roleId;
    const count = counts[id] || 0;
    el.classList.toggle('checked', count > 0);
    const badge = el.querySelector('[data-count-id]');
    if (badge) badge.textContent = count || '';
  });

  const connected = getHostState()?.players?.filter(p => p.connected)?.length || 0;
  const needed = _selectedRoleIds.length;
  const statusText = getLang() === 'en'
    ? `${needed} roles for ${connected} players`
    : `${needed} vai cho ${connected} người chơi`;

  // Update BOTH the WiFi-mode and offline-mode status labels + buttons
  const statusEls = [$('role-count-status'), $('offline-role-count-status')];
  statusEls.forEach(el => { if (el) el.textContent = statusText; });

  const canDeal = connected > 0 && needed === connected;
  const dealBtns = [$('btn-reveal-roles'), $('btn-offline-reveal-roles')];
  dealBtns.forEach(btn => { if (btn) btn.disabled = !canDeal; });
}

function dealRoles() {
  const result = assignRoles(_selectedRoleIds);
  if (!result.ok) {
    alert(result.error);
    return;
  }
  // Disable BOTH deal buttons, enable BOTH start buttons
  [$('btn-reveal-roles'), $('btn-offline-reveal-roles')].forEach(b => { if (b) b.disabled = true; });
  [$('btn-start-game'), $('btn-offline-start-game')].forEach(b => { if (b) b.disabled = false; });
  const doneMsg = getLang() === 'en'
    ? '✓ Roles dealt — tap Start Game when everyone is ready'
    : '✓ Đã chia vai, nhấn Bắt Đầu khi mọi người sẵn sàng';
  if ($('host-status')) $('host-status').textContent = doneMsg;
}

function startGame() {
  hostSetPhase(PHASE.NIGHT_INTRO);
  $('btn-start-game').disabled = true;
  showScreen('gm-panel');
  renderGMPanel();
  startNightIntro();
}

// ── OFFLINE MODE: host flow (no server, QR-only) ─────────────────────────────

let _offlinePendingPlayerId = null;

function startOfflineHostFlow() {
  _isHost = true;
  _myId = 'HOST';
  _offlineHostMode = true;
  hostInitOfflineMode();
  initHostGame();
  initState(true, 'HOST', onStateChange);
  buildOfflineRoleSelector();
  applyPreset(9);
  showScreen('offline-host');
  renderOfflineHostPlayers();
  bindOfflineHostSetup();
}

let _offlineSetupBound = false;
function bindOfflineHostSetup() {
  if (_offlineSetupBound) return;
  _offlineSetupBound = true;

  $('btn-offline-host-cancel')?.addEventListener('click', () => {
    disconnect();
    showScreen('home');
  });
  $('btn-offline-add-player')?.addEventListener('click', startOfflineAddPlayer);
  $('btn-offline-reveal-roles')?.addEventListener('click', dealRoles);
  $('btn-offline-start-game')?.addEventListener('click', startGame);
  $('btn-offline-pair-cancel')?.addEventListener('click', () => {
    if (_offlinePendingPlayerId) {
      try { window._cleanupPendingOfflinePeer?.(_offlinePendingPlayerId); } catch (_) {}
      _offlinePendingPlayerId = null;
    }
    showScreen('offline-host');
  });
  // (Preset buttons inside #screen-offline-host are already wired by bindHostSetup at boot
  //  since its querySelectorAll('.preset-btn') matches BOTH grids.)
}

function buildOfflineRoleSelector() {
  // Mirror buildRoleSelector but into #offline-role-selector-grid
  const grid = $('offline-role-selector-grid');
  if (!grid || grid.dataset.built) return;
  grid.dataset.built = '1';
  for (const [id, role] of Object.entries(ROLES)) {
    const div = document.createElement('div');
    div.className = 'role-checkbox';
    div.dataset.roleId = id;
    div.innerHTML = `
      <div class="check-dot"></div>
      <span class="role-name-short">${getLang() === 'en' ? role.nameEn : role.nameVi}</span>
      <span class="role-count-badge" data-count-id="${id}">0</span>
    `;
    div.addEventListener('click', () => toggleRole(id));
    grid.appendChild(div);
  }
}

async function startOfflineAddPlayer() {
  // Generate a new player ID and create an offer
  const newPlayerId = generateId();
  _offlinePendingPlayerId = newPlayerId;

  // Wait for name (could prompt, but we want it on the pair screen for UX)
  $('offline-player-name-input').value = '';
  $('offline-pair-status').textContent = t('offline_generating');
  $('btn-offline-scan-answer').disabled = true;

  showScreen('offline-pair');

  try {
    const offerSDP = await hostOfflineCreateOffer(newPlayerId, /*name=*/'(pending)');
    const encoded = await encodeSDP(offerSDP);
    // Render the QR
    renderQR($('offline-pair-qr'), encoded, 'L');
    $('offline-pair-status').textContent = t('offline_pair_step1');
    $('btn-offline-scan-answer').disabled = false;

    // When user taps "Scan Player's Answer"
    $('btn-offline-scan-answer').onclick = async () => {
      const name = $('offline-player-name-input').value.trim();
      if (!name) {
        $('offline-pair-status').textContent = t('offline_name_first');
        return;
      }
      try {
        const scanned = await scanQR({
          promptText: t('offline_scan_answer'),
          cancelText: t('btn_cancel'),
        });
        const answerSDP = await decodeSDP(scanned);
        // Update the player name in host-state when we connect
        // (we passed a placeholder when creating the offer — fix it here)
        hostOfflineAcceptAnswer(newPlayerId, answerSDP);
        _pendingOfflinePlayerName = name;
        _pendingOfflinePlayerId = newPlayerId;
        $('offline-pair-status').textContent = t('offline_connecting');

        // Timeout watchdog: if no connection event in 30s, surface a clear error
        const watchdog = setTimeout(() => {
          // Only fire if we're still on the pair screen (didn't connect)
          if (document.getElementById('screen-offline-pair')?.classList.contains('active')) {
            $('offline-pair-status').textContent = '⚠️ ' + t('offline_handshake_timeout');
          }
        }, 30000);
        // Clear when this player actually joins
        window._offlineWatchdogs = window._offlineWatchdogs || {};
        window._offlineWatchdogs[newPlayerId] = watchdog;
      } catch (err) {
        $('offline-pair-status').textContent = '⚠️ ' + (err.message || 'Scan failed');
      }
    };
  } catch (err) {
    $('offline-pair-status').textContent = '⚠️ ' + (err.message || 'Failed to create offer');
  }
}

let _pendingOfflinePlayerName = null;
let _pendingOfflinePlayerId = null;

function renderOfflineHostPlayers() {
  const list = $('offline-host-player-list');
  const countEl = $('offline-host-count');
  if (!list) return;
  const players = getHostState()?.players || [];
  if (countEl) countEl.textContent = String(players.length);
  if (players.length === 0) {
    list.innerHTML = `<li class="player-item" style="justify-content:center;color:var(--text-dim)">${t('host_no_players')}</li>`;
    return;
  }
  list.innerHTML = players.map(p => `
    <li class="player-item">
      <div class="player-dot ${p.connected ? '' : 'dead'}"></div>
      <span class="player-name">${p.name}</span>
    </li>
  `).join('');
}

// ── Host player events ────────────────────────────────────────────────────────

function handleHostPlayerJoined(playerId, playerName) {
  // If this came from the offline pairing flow, we have the real name pending
  const realName = (_pendingOfflinePlayerId === playerId && _pendingOfflinePlayerName)
    ? _pendingOfflinePlayerName
    : playerName;
  _pendingOfflinePlayerId = null;
  _pendingOfflinePlayerName = null;
  _offlinePendingPlayerId = null;

  // Clear any pending handshake-watchdog for this player
  if (window._offlineWatchdogs?.[playerId]) {
    clearTimeout(window._offlineWatchdogs[playerId]);
    delete window._offlineWatchdogs[playerId];
  }

  const result = hostAddPlayer(playerId, realName);
  if (result?.rejoined) {
    setTimeout(() => hostResendPrivateState(playerId), 350);
  }

  renderHostLobbyPlayers();
  renderOfflineHostPlayers();
  updateRoleSelectorUI();

  // Offline flow: jump back to the host setup screen after each successful pair
  const onPair = document.getElementById('screen-offline-pair')?.classList.contains('active');
  if (onPair) {
    setTimeout(() => showScreen('offline-host'), 600);
  }
}

function handleHostPlayerLeft(playerId) {
  hostRemovePlayer(playerId);
  renderHostLobbyPlayers();
  updateRoleSelectorUI();
}

function renderHostLobbyPlayers() {
  const list = $('host-player-list');
  if (!list) return;
  const players = getHostState()?.players || [];
  list.innerHTML = players.map(p => `
    <li class="player-item ${!p.connected ? 'dead' : ''}">
      <div class="player-dot ${!p.connected ? 'offline' : ''}"></div>
      <span class="player-name">${p.name}</span>
      ${p.roleId ? `<span class="player-role-label">${ROLES[p.roleId]?.nameVi || ''}</span>` : ''}
    </li>
  `).join('');
}

// ── Player Join ───────────────────────────────────────────────────────────────

function bindPlayerJoin() {
  $('btn-join-cancel').addEventListener('click', () => {
    clearSession();
    disconnect();
    showScreen('home');
  });

  // Offline join flow bindings
  $('btn-offline-scan-offer')?.addEventListener('click', startOfflinePlayerJoin);
  $('btn-offline-join-cancel')?.addEventListener('click', () => {
    disconnect();
    showScreen('home');
  });

  $('btn-do-join').addEventListener('click', doJoin);
  $('player-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doJoin();
  });
  $('room-code-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('player-name-input').focus();
  });
  $('room-code-input').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  });
}

async function doJoin() {
  const name = $('player-name-input').value.trim();
  const typedCode = $('room-code-input').value.trim().toUpperCase();
  if (typedCode) _roomCode = typedCode;
  if (!_roomCode || _roomCode.length < 4) {
    $('join-error').textContent = t('err_room_required');
    return;
  }
  if (!name) { $('join-error').textContent = t('err_name_required'); return; }

  _myName = name;
  _myId = generateId();
  $('join-error').textContent = '';
  $('join-error').className = 'status-text';
  $('btn-do-join').disabled = true;
  $('join-status').textContent = t('join_connecting');

  try {
    // Derive WS URL from current page origin (served by host device)
    _wsUrl = `ws://${location.hostname}:${location.port || 3000}`;
    initState(false, _myId, onStateChange);
    await playerJoin(_wsUrl, _roomCode, _myId, _myName);
    saveSession(_roomCode, _myName);
    $('join-status').textContent = t('join_connected');
    showScreen('lobby');
  } catch (err) {
    $('join-status').textContent = '';
    $('join-error').textContent = '⚠️ ' + err.message;
    $('join-error').className = 'status-text error';
    $('btn-do-join').disabled = false;
  }
}

async function startOfflinePlayerJoin() {
  const name = $('offline-join-name-input').value.trim();
  if (!name) {
    $('offline-join-error').textContent = t('err_name_required');
    return;
  }
  $('offline-join-error').textContent = '';
  $('offline-join-status').textContent = '';

  try {
    const scanned = await scanQR({
      promptText: t('offline_scan_offer'),
      cancelText: t('btn_cancel'),
    });
    const offerSDP = await decodeSDP(scanned);

    _myName = name;
    _myId = generateId();
    initState(false, _myId, onStateChange);

    $('offline-join-status').textContent = t('offline_generating');

    const answerSDP = await playerOfflineAcceptOffer(offerSDP, _myId);
    const encoded = await encodeSDP(answerSDP);

    // Send the player's name to the host as the first message after connection
    // (handled in onConnected callback automatically)
    _pendingOfflineMyName = name;

    renderQR($('offline-answer-qr'), encoded, 'L');
    $('offline-answer-wrap')?.classList.remove('hidden');
    $('offline-join-status').textContent = t('offline_connecting');

    // Timeout watchdog: if not connected in 30s, surface a clear error
    const watchdog = setTimeout(() => {
      if (document.getElementById('screen-offline-join')?.classList.contains('active')) {
        $('offline-join-error').textContent = '⚠️ ' + t('offline_handshake_timeout');
      }
    }, 30000);
    window._offlineJoinWatchdog = watchdog;
  } catch (err) {
    if (err.message === 'Scan cancelled') return;
    $('offline-join-error').textContent = '⚠️ ' + (err.message || 'Failed');
  }
}

let _pendingOfflineMyName = null;

function handlePlayerConnected() {
  // (Offline mode: host already has our name via the pairing flow's pending-name slot.)
  _pendingOfflineMyName = null;
  if (window._offlineJoinWatchdog) {
    clearTimeout(window._offlineJoinWatchdog);
    window._offlineJoinWatchdog = null;
  }
  showScreen('lobby');
}

function handleDisconnected() {
  const phase = getPhase();
  if (phase && phase !== PHASE.GAME_OVER) {
    alert('Mất kết nối với máy chủ.');
    disconnect();
    showScreen('home');
  }
}

// ── Game State Observer ───────────────────────────────────────────────────────

function onStateChange(state) {
  if (!state) return;
  switch (state.phase) {
    case PHASE.LOBBY:
      renderLobby(state);
      break;
    case PHASE.NIGHT_INTRO:
      showScreen('night');
      renderNightIntro(state);
      break;
    case PHASE.NIGHT_ACTIONS:
      showScreen('night');
      renderNightActions(state);
      break;
    case PHASE.NIGHT_RESOLVE:
      showScreen('night');
      renderNightResolve(state);
      break;
    case PHASE.DAY_INTRO:
      showScreen('day');
      renderDayIntro(state);
      break;
    case PHASE.DAY_DISCUSSION:
      showScreen('day');
      renderDayDiscussion(state);
      break;
    case PHASE.DAY_VOTE:
      showScreen('vote');
      renderVote(state);
      break;
    case PHASE.VOTE_RESULT:
      showScreen('vote');
      renderVoteResult(state);
      break;
    case PHASE.ELIMINATION:
      // shown via overlay
      break;
    case PHASE.GAME_OVER:
      showGameOver(state);
      break;
  }

  // Update timer display everywhere
  updateTimerDisplay(state);
}

// ── Lobby ─────────────────────────────────────────────────────────────────────

function renderLobby(state) {
  if (_isHost) return; // host stays on setup screen
  showScreen('lobby');
  const list = $('lobby-player-list');
  if (!list) return;
  list.innerHTML = state.players.map(p => `
    <li class="player-item">
      <div class="player-dot ${!p.connected ? 'offline' : ''}"></div>
      <span class="player-name">${p.name}${p.id === state.myPlayerId ? ' (Bạn)' : ''}</span>
    </li>
  `).join('');
}

// ── Night ─────────────────────────────────────────────────────────────────────

function startNightIntro() {
  if (!_isHost) return;
  broadcastToPlayers({ type: 'PHASE_CHANGE', phase: PHASE.NIGHT_INTRO, round: getHostState().round });
  setTimeout(() => {
    hostSetPhase(PHASE.NIGHT_ACTIONS);
    if (_isHost) {
      renderGMPanel();
      startNightTimer();
    }
  }, 4000);
}

function startNightTimer() {
  if (_hostTimer) _hostTimer.pause();
  _hostTimer = createTimer(90, (remaining) => {
    $('gm-timer-display').textContent = formatTime(remaining);
    $('gm-timer-display').classList.toggle('urgent', remaining <= 10);
    // Sync to players every 5s
    if (remaining % 5 === 0) {
      broadcastToPlayers({ type: 'TIMER_SYNC', remaining, duration: 90 });
    }
  }, () => {
    if (_isHost) {
      const { deaths } = resolveNight();
      broadcastNightResult(deaths);
    }
  });
  _hostTimer.start();
  broadcastToPlayers({ type: 'TIMER_SYNC', remaining: 90, duration: 90 });
}

function broadcastNightResult(deaths) {
  hostSetPhase(PHASE.NIGHT_RESOLVE);
  renderGMPanel();
}

function renderNightIntro(state) {
  $('night-round').textContent = `${t('night')} ${state.round}`;
  closeActionSheet();
}

function renderNightActions(state) {
  $('night-round').textContent = `${t('night')} ${state.round}`;
  updateTimerDisplay(state);

  if (!state.myRole || !isAlive()) {
    if (!isAlive()) showDeadOverlay();
    return;
  }

  const role = state.myRole;

  // Wolf team: show teammates
  if (state.wolfTeamIds.length > 1) {
    const wolfList = $('wolf-team-display');
    if (wolfList) {
      wolfList.innerHTML = state.wolfTeamIds
        .filter(id => id !== state.myPlayerId)
        .map(id => {
          const p = state.players.find(p => p.id === id);
          return `<span class="wolf-tag">🐺 ${p?.name || id}</span>`;
        }).join('');
      wolfList.closest('.wolf-team-wrap')?.classList.remove('hidden');
    }
  }

  if (role.hasNightAction && !state.nightActionSubmitted) {
    showNightActionSheet(state);
  }

  // Amor: night 1 only
  if (role.id === 'amor' && state.round === 1 && !state.nightActionSubmitted) {
    showAmorSheet(state);
  }
}

function showNightActionSheet(state) {
  const role = state.myRole;
  const alivePlayers = state.players.filter(p => p.alive && p.id !== state.myPlayerId);

  let title = '', instruction = '', onSelect = null;

  switch (role.id) {
    case 'werewolf':
    case 'alpha_wolf':
      title = t('sheet_wolf_title');
      instruction = t('sheet_wolf_instr');
      onSelect = id => submitWolfKill(id);
      break;
    case 'seer':
      title = t('sheet_seer_title');
      instruction = t('sheet_seer_instr');
      onSelect = id => {
        submitSeerCheck(id);
        const pName = state.players.find(p => p.id === id)?.name;
        $('action-sheet-container').innerHTML = `<div class="action-sheet"><h3>${t('sheet_seer_wait', { name: pName })}</h3></div>`;
      };
      break;
    case 'aura_seer':
      title = t('sheet_aura_title');
      instruction = t('sheet_aura_instr');
      onSelect = id => {
        submitAuraSeerCheck(id);
        const pName = state.players.find(p => p.id === id)?.name;
        $('action-sheet-container').innerHTML = `<div class="action-sheet"><h3>${t('sheet_aura_wait', { name: pName })}</h3></div>`;
      };
      break;
    case 'bodyguard':
      title = t('sheet_bodyguard_title');
      instruction = t('sheet_bodyguard_instr');
      onSelect = id => { submitBodyguardProtect(id); closeActionSheet(); };
      break;
    case 'trapper':
      title = t('sheet_trapper_title');
      instruction = t('sheet_trapper_instr');
      onSelect = id => { submitTrap(id); closeActionSheet(); };
      break;
    case 'priest':
      title = t('sheet_priest_title');
      instruction = t('sheet_priest_instr');
      onSelect = id => { submitPriestBless(id); closeActionSheet(); };
      break;
    case 'medium':
      title = t('sheet_medium_title');
      instruction = t('sheet_medium_instr');
      const deadPlayers = state.players.filter(p => !p.alive);
      showActionSheet(title, instruction, deadPlayers, id => {
        submitMediumCommune(id);
        closeActionSheet();
      });
      return;
    case 'witch':
      showWitchSheet(state);
      return;
  }

  if (onSelect) showActionSheet(title, instruction, alivePlayers, onSelect);
}

function showWitchSheet(state) {
  const container = $('action-sheet-container');
  const healOk = !state.witchHealUsed;
  const poisonOk = !state.witchPoisonUsed;

  container.innerHTML = `
    <div class="action-sheet">
      <h3>${t('sheet_witch_title')}</h3>
      <p class="hint">${!healOk && !poisonOk ? t('sheet_witch_used_all') : t('sheet_witch_or_skip')}</p>
      <div class="btn-group" style="max-width:280px">
        <button class="btn btn-secondary btn-sm" id="witch-heal-btn" ${!healOk ? 'disabled' : ''}>
          ${t('btn_witch_heal')}
        </button>
        <button class="btn btn-danger btn-sm" id="witch-poison-btn" ${!poisonOk ? 'disabled' : ''}>
          ${t('btn_witch_poison')}
        </button>
        <button class="btn btn-ghost btn-sm" id="witch-skip-btn">${t('btn_skip')}</button>
      </div>
    </div>
  `;

  if (healOk) {
    $('witch-heal-btn').addEventListener('click', () => {
      submitWitchHeal();
      container.innerHTML = `<div class="action-sheet"><h3>${t('witch_heal_used')}</h3></div>`;
    });
  }
  if (poisonOk) {
    $('witch-poison-btn').addEventListener('click', () => {
      const alive = state.players.filter(p => p.alive && p.id !== state.myPlayerId);
      showActionSheet('☠️ Chọn nạn nhân độc', 'Chọn một người để đầu độc', alive, id => {
        submitWitchPoison(id);
        closeActionSheet();
      });
    });
  }
  $('witch-skip-btn').addEventListener('click', closeActionSheet);
}

function showAmorSheet(state) {
  const alivePlayers = state.players.filter(p => p.alive && p.id !== state.myPlayerId);
  let first = null;
  const container = $('action-sheet-container');
  container.innerHTML = `
    <div class="action-sheet">
      <h3>💘 Chọn hai người để kết đôi</h3>
      <p class="hint">Nếu một người chết, người kia cũng chết theo</p>
      <ul class="player-list scroll-area" id="amor-player-list"></ul>
    </div>
  `;
  const list = $('amor-player-list');
  list.innerHTML = alivePlayers.map(p => `
    <li class="player-item" data-id="${p.id}">
      <div class="player-dot"></div>
      <span class="player-name">${p.name}</span>
    </li>
  `).join('');
  list.querySelectorAll('.player-item').forEach(item => {
    item.addEventListener('click', () => {
      if (!first) {
        first = item.dataset.id;
        item.classList.add('selected-target');
      } else if (item.dataset.id !== first) {
        submitAmorLink(first, item.dataset.id);
        container.innerHTML = `<div class="action-sheet"><h3>💘 Đã kết đôi!</h3></div>`;
      }
    });
  });
}

function showActionSheet(title, instruction, players, onSelect) {
  const container = $('action-sheet-container');
  container.innerHTML = `
    <div class="action-sheet">
      <h3>${title}</h3>
      <p class="hint">${instruction}</p>
      <ul class="player-list scroll-area" id="action-player-list"></ul>
      <button class="btn btn-ghost btn-sm" id="action-skip-btn" style="margin-top:.5rem">Bỏ qua đêm nay</button>
    </div>
  `;
  const list = $('action-player-list');
  list.innerHTML = players.map(p => `
    <li class="player-item" data-id="${p.id}">
      <div class="player-dot ${!p.alive ? 'dead' : ''}"></div>
      <span class="player-name ${!p.alive ? 'dead' : ''}">${p.name}</span>
    </li>
  `).join('');
  list.querySelectorAll('.player-item').forEach(item => {
    item.addEventListener('click', () => {
      list.querySelectorAll('.player-item').forEach(i => i.classList.remove('selected-target'));
      item.classList.add('selected-target');
      onSelect(item.dataset.id);
    });
  });
  $('action-skip-btn').addEventListener('click', closeActionSheet);
}

function closeActionSheet() {
  const c = $('action-sheet-container');
  if (c) c.innerHTML = '';
}

function renderNightResolve(state) {
  closeActionSheet();
}

// ── Day ───────────────────────────────────────────────────────────────────────

function renderDayIntro(state) {
  $('day-round').textContent = `${t('day')} ${state.round}`;
  $('day-player-list').innerHTML = renderPlayerListHTML(state);
}

function renderDayDiscussion(state) {
  $('day-round').textContent = `${t('day')} ${state.round}`;
  $('day-player-list').innerHTML = renderPlayerListHTML(state);
  updateTimerDisplay(state);

  // Gunner day action
  if (state.myRole?.hasDayAction && state.myRole?.id === 'gunner' && isAlive() && state.gunnerBullets > 0) {
    $('gunner-action-wrap')?.classList.remove('hidden');
    $('gunner-bullets-left').textContent = state.gunnerBullets;
  } else {
    $('gunner-action-wrap')?.classList.add('hidden');
  }
}

function renderPlayerListHTML(state) {
  return state.players.map(p => `
    <li class="player-item ${!p.alive ? 'dead' : ''}">
      <div class="player-dot ${!p.alive ? 'dead' : ''}"></div>
      <span class="player-name">${p.name}${p.id === state.myPlayerId ? ' (Bạn)' : ''}</span>
    </li>
  `).join('');
}

// ── Vote ──────────────────────────────────────────────────────────────────────

function renderVote(state) {
  $('vote-round').textContent = `${t('day')} ${state.round}`;
  const alivePlayers = state.players.filter(p => p.alive);
  const list = $('vote-player-list');
  if (!list) return;

  list.innerHTML = alivePlayers.map(p => {
    const voteCount = state.votes[p.id] || 0;
    const isMe = p.id === state.myPlayerId;
    const myVoteTarget = state.myVote === p.id;
    return `
      <li class="player-item ${myVoteTarget ? 'selected-target' : ''}" data-id="${p.id}">
        <div class="player-dot"></div>
        <span class="player-name">${p.name}${isMe ? ' (Bạn)' : ''}</span>
        <span class="vote-count">${voteCount > 0 ? voteCount + ' 🗳' : ''}</span>
      </li>
    `;
  }).join('');

  if (!_isHost && isAlive()) {
    list.querySelectorAll('.player-item').forEach(item => {
      if (item.dataset.id === state.myPlayerId) return;
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        submitVote(item.dataset.id);
      });
    });
  }

  // Host "Kết thúc bỏ phiếu" button
  if (_isHost) {
    $('btn-end-vote')?.classList.remove('hidden');
  }
}

function renderVoteResult(state) {
  // Show for 5s then move on
  $('vote-round').textContent = 'Kết quả bỏ phiếu';
  const list = $('vote-player-list');
  if (list) {
    list.innerHTML = state.players.filter(p => p.alive).map(p => {
      const voteCount = state.votes[p.id] || 0;
      return `
        <li class="player-item">
          <div class="player-dot"></div>
          <span class="player-name">${p.name}</span>
          <span class="vote-count">${voteCount} 🗳</span>
        </li>
      `;
    }).join('');
  }
}

// ── Elimination Overlay ───────────────────────────────────────────────────────

function showEliminationOverlay(eliminatedId, roleId, cause) {
  const state = getState();
  const target = state.players.find(p => p.id === eliminatedId);
  if (!target) return;

  const role = ROLES[roleId];
  const overlay = $('elimination-overlay');
  if (!overlay) return;

  overlay.innerHTML = `
    <div class="role-reveal-wrap">
      <p class="hint" style="margin-bottom:1rem">
        ${cause === 'wolf' ? '🌙 Sói đã tấn công' : cause === 'vote' ? '☀️ Làng đã bỏ phiếu loại' : '⚰️ Bị loại'}
      </p>
      <h3 style="font-family:var(--font-title);color:var(--text-accent);margin-bottom:1rem">${target.name}</h3>
    </div>
  `;

  if (role) {
    const card = makeRoleCard(roleId);
    if (card) {
      card.classList.add('reveal-anim');
      overlay.querySelector('.role-reveal-wrap').appendChild(card);
    }
  }

  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('hidden'), 6000);
}

// ── Role Reveal (private — for the player themselves) ─────────────────────────

function applyAmbientRolePhoto(roleId) {
  // Sets the player's body background to a dimmed version of their role art,
  // so the character stays present through Night/Day/Vote screens.
  if (!roleId) return;
  document.body.style.setProperty('--my-role-photo', `url('${new URL(`assets/roles/${roleId}.jpg`, document.baseURI).href}')`);
  document.body.classList.add('has-role-photo');
}

function showPrivateRoleReveal(roleId, skipScreenSwitch) {
  const r = ROLES[roleId];
  if (!r) return;

  // Set ambient backdrop for the rest of the game
  applyAmbientRolePhoto(roleId);

  // Full-screen character art as the background
  const photoEl = $('role-reveal-photo');
  if (photoEl) {
    photoEl.style.backgroundImage = `url('${new URL(`assets/roles/${roleId}.jpg`, document.baseURI).href}')`;
    photoEl.className = `role-reveal-photo faction-${r.faction}`;
  }

  // Pick primary/secondary based on current UI language
  const lang = getLang();
  const primaryName    = lang === 'en' ? r.nameEn : r.nameVi;
  const secondaryName  = lang === 'en' ? r.nameVi : r.nameEn;
  const primaryAbility = lang === 'en' ? r.abilityEn : r.abilityVi;
  const secondaryAbility = lang === 'en' ? r.abilityVi : r.abilityEn;

  // Faction + timing labels (translated)
  const factionLabel = lang === 'en'
    ? ({ wolf: 'Wolf Team', village: 'Village Team', neutral: 'Neutral' }[r.faction] || r.factionLabel)
    : r.factionLabel;
  const timingLabel = lang === 'en'
    ? ({ 'timing-night': '🌙 Night', 'timing-day': '☀️ Day', 'timing-passive': 'Passive', 'timing-any': 'Anytime' }[r.timingClass] || r.timingLabel)
    : r.timingLabel;

  // Role info block
  const info = $('role-reveal-info');
  if (info) {
    info.className = `role-reveal-info faction-${r.faction}`;
    info.innerHTML = `
      <div class="role-reveal-badges">
        <span class="faction-badge">${factionLabel}</span>
        <span class="timing-badge ${r.timingClass}">${timingLabel}</span>
      </div>
      <h2 class="role-reveal-name-vi">${primaryName}</h2>
      <p class="role-reveal-name-en">${secondaryName}</p>
      <div class="role-reveal-ability">
        <p class="ability-vi">${primaryAbility}</p>
        <p class="ability-en">${secondaryAbility}</p>
      </div>
    `;
  }

  if (!skipScreenSwitch) showScreen('role-reveal');

  // Wolf teammates label (only shown to wolf-faction players with allies)
  $('wolf-teammates-label')?.classList.add('hidden');
  const state = getState();
  if (state.wolfTeamIds.length > 1) {
    const wolfNames = state.wolfTeamIds
      .filter(id => id !== state.myPlayerId)
      .map(id => state.players.find(p => p.id === id)?.name)
      .filter(Boolean);
    if (wolfNames.length) {
      $('wolf-teammates-label')?.classList.remove('hidden');
      $('wolf-teammates-label').textContent = `${t('wolf_teammates')} ${wolfNames.join(', ')}`;
    }
  }

  $('btn-role-got-it')?.addEventListener('click', () => {
    showScreen('lobby');
  }, { once: true });
}

// ── GM Panel ──────────────────────────────────────────────────────────────────

function bindGMPanel() {
  $('gm-panel-toggle')?.addEventListener('click', () => {
    _gmPanelOpen = !_gmPanelOpen;
    $('gm-panel')?.classList.toggle('hidden', !_gmPanelOpen);
  });

  $('btn-gm-close')?.addEventListener('click', () => {
    _gmPanelOpen = false;
    $('gm-panel')?.classList.add('hidden');
  });

  $('btn-gm-next-phase')?.addEventListener('click', advancePhase);
  $('btn-end-vote')?.addEventListener('click', () => {
    if (_isHost) {
      const result = resolveVote();
      if (!result.eliminated) hostSetPhase(PHASE.NIGHT_INTRO);
    }
  });
  $('btn-start-night-timer')?.addEventListener('click', startNightTimer);
  $('btn-resolve-night')?.addEventListener('click', () => {
    if (_isHost) {
      const { deaths } = resolveNight();
      hostSetPhase(PHASE.NIGHT_RESOLVE);
      renderGMPanel();
    }
  });
  $('btn-start-day')?.addEventListener('click', () => {
    if (_isHost) {
      hostSetPhase(PHASE.DAY_INTRO);
      setTimeout(() => hostSetPhase(PHASE.DAY_DISCUSSION), 3000);
    }
  });
  $('btn-start-vote')?.addEventListener('click', () => {
    if (_isHost) hostSetPhase(PHASE.DAY_VOTE);
  });
}

function renderGMPanel() {
  if (!_isHost) return;
  const hs = getHostState();
  if (!hs) return;

  // Wake-up ring section: one button per role currently in play with at least one alive player
  const wakeWrap = $('wake-ring-list');
  if (wakeWrap) {
    const roleIdsInPlay = [...new Set(hs.players.filter(p => p.alive && p.roleId).map(p => p.roleId))];
    // Sort by night resolve order so the GM rings them in canonical order
    roleIdsInPlay.sort((a, b) => (ROLES[a]?.resolveOrder ?? 99) - (ROLES[b]?.resolveOrder ?? 99));
    if (roleIdsInPlay.length === 0) {
      wakeWrap.innerHTML = `<p class="hint" style="color:var(--text-dim)">${t('gm_no_roles_dealt')}</p>`;
    } else {
      const lang = getLang();
      wakeWrap.innerHTML = roleIdsInPlay.map(rid => {
        const r = ROLES[rid];
        const count = hs.players.filter(p => p.alive && p.roleId === rid).length;
        const icon = r.timingClass === 'timing-night' ? '🌙' :
                     r.timingClass === 'timing-day'   ? '☀️' : '⚪';
        const rname = lang === 'en' ? r.nameEn : r.nameVi;
        return `
          <div class="wake-ring-row">
            <span class="wake-ring-icon">${icon}</span>
            <span class="wake-ring-name">${rname}</span>
            <span class="wake-ring-count">×${count}</span>
            <button class="btn btn-secondary btn-sm" onclick="window._gmRing('${rid}')">🔔</button>
            <button class="btn btn-ghost btn-sm" onclick="window._gmSleep('${rid}')">😴</button>
          </div>
        `;
      }).join('');
    }
  }

  // Player elimination tracker
  const tracker = $('elimination-tracker');
  if (tracker) {
    const lang = getLang();
    tracker.innerHTML = hs.players.map(p => `
      <div class="player-item ${!p.alive ? 'dead' : ''}" style="cursor:${p.alive ? 'pointer' : 'default'}">
        <div class="player-dot ${!p.alive ? 'dead' : ''}"></div>
        <span class="player-name">${p.name}</span>
        <span class="player-role-label">${(lang === 'en' ? ROLES[p.roleId]?.nameEn : ROLES[p.roleId]?.nameVi) || '?'}</span>
        ${p.alive
          ? `<button class="btn btn-danger btn-sm" onclick="window._gmEliminate('${p.id}')">${t('btn_kick')}</button>`
          : `<span style="color:var(--text-dim);font-size:.7rem">${t('label_dead')}</span>`
        }
      </div>
    `).join('');
  }

  // Game log
  const logEl = $('gm-game-log');
  if (logEl) {
    logEl.innerHTML = getLog().map(e => `<div class="log-entry">${e.text}</div>`).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  // Phase label
  if ($('gm-phase-label')) $('gm-phase-label').textContent = hs.phase;
  if ($('gm-round-label')) $('gm-round-label').textContent = `${t('gm_round')} ${hs.round}`;
}

// Run win check, broadcast to all, AND fire the game-over screen on the host's own device.
// Also dismisses any wake-up overlay so the result is visible.
function hostCheckWin() {
  const winner = checkWinConditions();
  if (!winner) return;
  // Force all wake-up overlays closed across all players
  const hs = getHostState();
  for (const p of hs.players) {
    if (p.connected) sendToPlayer(p.id, { type: 'GO_TO_SLEEP' });
  }
  // Dismiss host's own wake overlay (in case the host was also a player… they're not, but be safe)
  dismissWakeUpOverlay();
  // Trigger host's own game-over screen
  applyGameOver({ winner });
  document.body.classList.add('is-host-game-over');
  showGameOver({ winner });
}

// Ring a role: send WAKE_UP to every alive player holding that role
window._gmRing = function(roleId) {
  if (!_isHost) return;
  const hs = getHostState();
  const targets = hs.players.filter(p => p.alive && p.roleId === roleId);
  if (targets.length === 0) return;
  for (const p of targets) {
    sendToPlayer(p.id, { type: 'WAKE_UP', roleId });
  }
};

// Force-sleep a role: dismiss WAKE_UP overlay on every alive player with that role
window._gmSleep = function(roleId) {
  if (!_isHost) return;
  const hs = getHostState();
  const targets = hs.players.filter(p => p.alive && p.roleId === roleId);
  for (const p of targets) {
    sendToPlayer(p.id, { type: 'GO_TO_SLEEP', roleId });
  }
};

// Expose for inline onclick (elimination tracker buttons)
window._gmEliminate = function(playerId) {
  if (!_isHost) return;
  const hs = getHostState();
  const p = hs.players.find(p => p.id === playerId);
  if (!p || !p.alive) return;
  const roleName = getLang() === 'en' ? ROLES[p.roleId]?.nameEn : ROLES[p.roleId]?.nameVi;
  if (!confirm(t('confirm_eliminate', { name: p.name, role: roleName || '?' }))) return;

  broadcastToPlayers({
    type: 'PHASE_CHANGE',
    phase: PHASE.ELIMINATION,
    round: hs.round,
    eliminatedId: playerId,
    revealRole: p.roleId,
    cause: 'manual',
  });
  p.alive = false;
  broadcastLobbyUpdate();
  hostCheckWin();
  renderGMPanel();
};

function advancePhase() {
  if (!_isHost) return;
  const hs = getHostState();
  const next = {
    [PHASE.LOBBY]:           PHASE.NIGHT_INTRO,
    [PHASE.NIGHT_INTRO]:     PHASE.NIGHT_ACTIONS,
    [PHASE.NIGHT_ACTIONS]:   PHASE.NIGHT_RESOLVE,
    [PHASE.NIGHT_RESOLVE]:   PHASE.DAY_INTRO,
    [PHASE.DAY_INTRO]:       PHASE.DAY_DISCUSSION,
    [PHASE.DAY_DISCUSSION]:  PHASE.DAY_VOTE,
    [PHASE.DAY_VOTE]:        PHASE.VOTE_RESULT,
    [PHASE.VOTE_RESULT]:     PHASE.ELIMINATION,
    [PHASE.ELIMINATION]:     PHASE.NIGHT_INTRO,
  }[hs.phase];
  if (next) {
    hostSetPhase(next);
    renderGMPanel();
  }
}

// ── Message Handler (from network) ───────────────────────────────────────────

function handleMessage(msg, fromId) {
  if (_isHost) {
    handleHostMessage(msg, fromId);
  } else {
    handlePlayerMessage(msg);
  }
}

function handleHostMessage(msg, fromId) {
  switch (msg.type) {
    case 'NIGHT_ACTION':
      hostReceiveNightAction(fromId, msg.action);
      break;
    case 'VOTE':
      hostReceiveVote(fromId, msg.targetId);
      break;
    case 'GUNNER_SHOOT':
      hostReceiveGunnerShoot(fromId, msg.targetId);
      break;
    case 'HUNTER_SHOT':
      // Hunter chose target after death
      broadcastToPlayers({
        type: 'PHASE_CHANGE',
        phase: PHASE.ELIMINATION,
        round: getHostState().round,
        eliminatedId: msg.targetId,
        revealRole: getHostState().players.find(p => p.id === msg.targetId)?.roleId,
        cause: 'hunter',
      });
      const target = getHostState().players.find(p => p.id === msg.targetId);
      if (target) target.alive = false;
      broadcastLobbyUpdate();
      hostCheckWin();
      break;
  }
}

function handlePlayerMessage(msg) {
  switch (msg.type) {
    case 'PHASE_CHANGE':
      applyPhaseChange(msg);
      if (msg.eliminatedId) {
        applyElimination({ eliminatedId: msg.eliminatedId });
        showEliminationOverlay(msg.eliminatedId, msg.revealRole, msg.cause);
        if (msg.eliminatedId === _myId) showDeadOverlay();
      }
      break;
    case 'LOBBY_UPDATE':
      applyLobbyUpdate(msg);
      break;
    case 'YOUR_ROLE':
      applyMyRole(msg);
      showPrivateRoleReveal(msg.roleId);
      break;
    case 'WOLF_TEAM':
      applyWolfTeam(msg);
      break;
    case 'AMOR_LINK':
      applyAmorLink(msg);
      showAmorNotification(msg);
      break;
    case 'VOTE_UPDATE':
      applyVoteUpdate(msg);
      break;
    case 'VOTE_RESULT':
      applyVoteResult(msg);
      break;
    case 'TIMER_SYNC':
      applyTimerSync(msg);
      break;
    case 'GAME_OVER':
      dismissWakeUpOverlay();
      // Clear any open action sheets / dead overlay shouldn't block visibility
      const sheet = document.getElementById('action-sheet-container');
      if (sheet) sheet.innerHTML = '';
      applyGameOver(msg);
      // Clear stored session so a refresh on the next round doesn't auto-rejoin a dead game
      clearSession();
      break;
    case 'SEER_RESULT':
      showSeerResult(msg);
      break;
    case 'AURA_RESULT':
      showAuraResult(msg);
      break;
    case 'MEDIUM_RESULT':
      showMediumResult(msg);
      break;
    case 'HUNTER_RETALIATE':
      showHunterRetaliation();
      break;
    case 'CONVERTED':
      applyMyRole(msg);
      applyAmbientRolePhoto(msg.roleId);
      alert(t('convert_alert'));
      break;
    case 'WAKE_UP':
      showWakeUpOverlay(msg.roleId);
      break;
    case 'GO_TO_SLEEP':
      dismissWakeUpOverlay();
      break;
    case 'NEW_GAME':
      // Reset local state, head back to lobby — host will reseat us
      dismissWakeUpOverlay();
      document.body.classList.remove('has-role-photo');
      document.body.style.removeProperty('--my-role-photo');
      resetState();
      // Keep the session so we're still associated with this room+name
      initState(false, _myId, onStateChange);
      showScreen('lobby');
      break;
    case 'ROOM_CLOSED':
      clearSession();
      alert(t('room_closed_alert'));
      disconnect();
      document.body.classList.remove('has-role-photo');
      document.body.style.removeProperty('--my-role-photo');
      showScreen('home');
      break;
  }
}

// ── Wake-up overlay (host rings a role) ──────────────────────────────────────

function showWakeUpOverlay(roleId) {
  const role = ROLES[roleId];
  if (!role) return;

  // Vibrate if supported (Android browsers, silently ignored on iOS Safari)
  try { navigator.vibrate?.([220, 110, 220, 110, 220]); } catch (_) {}

  // Soft bell tone via Web Audio (no asset needed)
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 1.0);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch (_) {}

  // Remove any existing overlay so a re-ring restarts cleanly
  document.getElementById('wake-up-overlay')?.remove();

  const lang = getLang();
  const primaryName = lang === 'en' ? role.nameEn : role.nameVi;
  const overlay = document.createElement('div');
  overlay.id = 'wake-up-overlay';
  overlay.className = `wake-up-overlay faction-${role.faction}`;
  overlay.style.setProperty('--wake-photo', `url('${new URL(`assets/roles/${roleId}.jpg`, document.baseURI).href}')`);
  overlay.innerHTML = `
    <div class="wake-up-photo"></div>
    <div class="wake-up-scrim"></div>
    <div class="wake-up-content">
      <div class="wake-up-moon">🌙</div>
      <div class="wake-up-role">${primaryName}</div>
      <div class="wake-up-sub">${t('wake_sub')}</div>
      <button class="btn btn-primary" id="btn-wake-sleep">${t('btn_sleep')}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#btn-wake-sleep').addEventListener('click', () => {
    overlay.classList.add('wake-up-dismissing');
    setTimeout(() => overlay.remove(), 350);
  });
}

function dismissWakeUpOverlay() {
  const overlay = document.getElementById('wake-up-overlay');
  if (!overlay) return;
  overlay.classList.add('wake-up-dismissing');
  setTimeout(() => overlay.remove(), 350);
}

// ── Notification helpers ──────────────────────────────────────────────────────

function showSeerResult(msg) {
  const state = getState();
  const target = state.players.find(p => p.id === msg.targetId);
  const name = target?.name || '?';
  const result = msg.isWolf ? t('seer_is_wolf') : t('seer_not_wolf');
  const container = $('action-sheet-container');
  if (container) {
    container.innerHTML = `
      <div class="action-sheet">
        <h3>${t('seer_result_title')}</h3>
        <p style="font-family:var(--font-prose);font-size:1.1rem;color:${msg.isWolf ? 'var(--text-danger)' : 'var(--text-success)'}">
          ${name}: ${result}
        </p>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('action-sheet-container').innerHTML=''">${t('close')}</button>
      </div>
    `;
  }
}

function showAuraResult(msg) {
  const state = getState();
  const target = state.players.find(p => p.id === msg.targetId);
  const name = target?.name || '?';
  const result = msg.aura === 'evil' ? t('aura_evil') : t('aura_good');
  const container = $('action-sheet-container');
  if (container) {
    container.innerHTML = `
      <div class="action-sheet">
        <h3>${t('aura_result_title')}</h3>
        <p style="font-family:var(--font-prose);font-size:1.1rem;color:${msg.aura === 'evil' ? 'var(--text-danger)' : 'var(--faction-village)'}">
          ${name}: ${result}
        </p>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('action-sheet-container').innerHTML=''">${t('close')}</button>
      </div>
    `;
  }
}

function showMediumResult(msg) {
  const container = $('action-sheet-container');
  if (container) {
    container.innerHTML = `
      <div class="action-sheet">
        <h3>🔮 Đồng Cốt nhận được</h3>
        <p style="font-family:var(--font-prose);font-size:1rem">
          ${msg.targetName} đã là: <strong style="color:var(--text-accent)">${ROLES[msg.roleId]?.nameVi || '?'}</strong>
        </p>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('action-sheet-container').innerHTML=''">Đóng</button>
      </div>
    `;
  }
}

function showHunterRetaliation() {
  const state = getState();
  const alivePlayers = state.players.filter(p => p.alive);
  showActionSheet(
    '🏹 Thợ Săn — Bắn trả!',
    'Bạn bị loại! Chọn một người để bắn trả trước khi rời.',
    alivePlayers,
    id => { submitHunterShoot(id); closeActionSheet(); }
  );
}

function showAmorNotification(msg) {
  const state = getState();
  const partner = state.players.find(p => p.id === msg.partnerId);
  alert(`💘 Bạn bị Thần Tình Yêu kết đôi với ${partner?.name || msg.partnerId}.\nNếu một trong hai chết, người kia cũng sẽ chết theo.`);
}

function showDeadOverlay() {
  $('dead-overlay')?.classList.remove('hidden');
}

// ── Timer display ─────────────────────────────────────────────────────────────

function updateTimerDisplay(state) {
  const remaining = state.timerRemaining;
  document.querySelectorAll('.timer-display').forEach(el => {
    el.textContent = formatTime(remaining);
    el.classList.toggle('urgent', remaining > 0 && remaining <= 10);
  });
}

// ── Game Over ─────────────────────────────────────────────────────────────────

function showGameOver(state) {
  showScreen('game-over');

  const messages = {
    village: { icon: '🏘️', title: t('win_village_title'), sub: t('win_village_sub') },
    wolves:  { icon: '🐺', title: t('win_wolves_title'),  sub: t('win_wolves_sub') },
    jester:  { icon: '🃏', title: t('win_jester_title'),  sub: t('win_jester_sub') },
    amor:    { icon: '💕', title: t('win_amor_title'),    sub: t('win_amor_sub') },
  };

  const m = messages[state.winner] || { icon: '🏆', title: t('game_over_default'), sub: '' };
  $('winner-icon').textContent = m.icon;
  $('winner-title').textContent = m.title;
  $('winner-sub').textContent = m.sub;

  // Full role reveal: every player + their role + alive/dead, shown on every device
  const wrap = $('game-over-reveal-wrap');
  const listEl = $('game-over-reveal-list');
  const players = _isHost ? getHostState()?.players : getState().players;
  if (wrap && listEl && players && players.length) {
    wrap.style.display = '';
    const lang = getLang();
    listEl.innerHTML = players.map(p => {
      const r = p.roleId ? ROLES[p.roleId] : null;
      const roleName = r ? (lang === 'en' ? r.nameEn : r.nameVi) : '';
      const factionTag = r ? `<span class="player-role-label faction-${r.faction}">${roleName}</span>` : '';
      return `
        <li class="player-item ${!p.alive ? 'dead' : ''}">
          <div class="player-dot ${!p.alive ? 'dead' : ''}"></div>
          <span class="player-name">${p.name}</span>
          ${factionTag}
          ${!p.alive ? '<span style="color:var(--text-dim);font-size:.7rem">💀</span>' : ''}
        </li>
      `;
    }).join('');
  }

  // Host vs player buttons
  if (_isHost) {
    $('btn-play-again')?.classList.remove('hidden');
    $('btn-end-room')?.classList.remove('hidden');
    $('game-over-player-wait')?.classList.add('hidden');
  } else {
    $('btn-play-again')?.classList.add('hidden');
    $('btn-end-room')?.classList.add('hidden');
    $('game-over-player-wait')?.classList.remove('hidden');
  }

  $('btn-play-again')?.addEventListener('click', () => {
    // Host triggers a new game in the same room with the same connected players
    if (!_isHost) return;
    broadcastToPlayers({ type: 'NEW_GAME' });
    // Reset host-side state, keep player connections + names
    const oldPlayers = getHostState().players.map(p => ({ id: p.id, name: p.name, connected: p.connected }));
    initHostGame();
    for (const p of oldPlayers) {
      if (p.connected) hostAddPlayer(p.id, p.name);
    }
    document.body.classList.remove('is-host-game-over');

    // Route to the correct setup screen based on which mode we started in
    if (_offlineHostMode) {
      showScreen('offline-host');
      renderOfflineHostPlayers();
    } else {
      showScreen('host-setup');
      renderHostLobbyPlayers();
    }
    applyPreset(Math.max(9, oldPlayers.filter(p => p.connected).length));
  }, { once: true });

  $('btn-end-room')?.addEventListener('click', () => {
    if (!_isHost) return;
    broadcastToPlayers({ type: 'ROOM_CLOSED' });
    clearSession();
    disconnect();
    document.body.classList.remove('is-host-game-over');
    showScreen('home');
  }, { once: true });
}
