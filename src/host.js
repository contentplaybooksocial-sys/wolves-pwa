// ── Host (Game Master) Logic ──────────────────────────────────────────────────
// All authoritative game state lives here on the host device.

import { ROLES, PRESETS, fisherYatesShuffle } from './roles.js';
import { PHASE } from './state.js';
import { broadcastToPlayers, sendToPlayer, getConnectedPlayerIds } from './network.js';
import { createTimer, formatTime } from './timer.js';

// ── Host-side state ───────────────────────────────────────────────────────────
let _hostState = null;

function makeHostState() {
  return {
    phase: PHASE.SETUP,
    round: 0,
    players: [],    // [{ id, name, alive, connected, roleId }]
    selectedRoles: [], // roleId[] chosen for this game
    amorLink: null, // [id, id] | null
    trapTarget: null, // playerId | null
    bodyguardLastProtect: null,
    nightActions: {},   // { playerId: { type, target?, ... } }
    log: [],            // LogEntry[]
    votes: {},          // { targetId: voteCount }
    wolfTeam: [],       // playerIds with wolf faction
    gunnerBullets: {}, // { playerId: remaining }
    witchState: {},     // { playerId: { healUsed, poisonUsed } }
  };
}

export function getHostState() { return _hostState; }

// ── Init ──────────────────────────────────────────────────────────────────────

export function initHostGame() {
  _hostState = makeHostState();
}

// ── Player registry ───────────────────────────────────────────────────────────

export function hostAddPlayer(playerId, playerName) {
  if (_hostState.players.find(p => p.id === playerId)) return null;

  // Reconnect: if a disconnected player with the same name already exists,
  // rebind their record to the new playerId so they keep their role + state.
  const existing = _hostState.players.find(
    p => !p.connected && p.name.trim().toLowerCase() === playerName.trim().toLowerCase()
  );
  if (existing) {
    existing.id = playerId;
    existing.connected = true;
    broadcastLobbyUpdate();
    return { rejoined: true, player: existing };
  }

  const fresh = { id: playerId, name: playerName, alive: true, connected: true, roleId: null };
  _hostState.players.push(fresh);
  broadcastLobbyUpdate();
  return { rejoined: false, player: fresh };
}

export function hostRemovePlayer(playerId) {
  const p = _hostState.players.find(p => p.id === playerId);
  if (p) p.connected = false;
  broadcastLobbyUpdate();
}

// Resend a player their per-role private info (used after a rejoin)
export function hostResendPrivateState(playerId) {
  const p = _hostState.players.find(p => p.id === playerId);
  if (!p || !p.roleId) return;

  // Their role
  sendToPlayer(playerId, {
    type: 'YOUR_ROLE',
    roleId: p.roleId,
  });

  // Wolf team (only if they're a wolf)
  const role = ROLES[p.roleId];
  if (role?.isWolf) {
    const memberIds = _hostState.players.filter(x => ROLES[x.roleId]?.isWolf).map(x => x.id);
    sendToPlayer(playerId, { type: 'WOLF_TEAM', memberIds });
  }

  // Amor link (if they were linked)
  if (p.amorLink) {
    sendToPlayer(playerId, { type: 'AMOR_LINK', partnerId: p.amorLink });
  }

  // Current phase + round so they sync to where the game is
  sendToPlayer(playerId, {
    type: 'PHASE_CHANGE',
    phase: _hostState.phase,
    round: _hostState.round,
  });

  // Refresh lobby snapshot so they see everyone's alive/dead state
  broadcastLobbyUpdate();
}

export function broadcastLobbyUpdate() {
  const players = _hostState.players.map(({ id, name, alive, connected }) => ({ id, name, alive, connected }));
  broadcastToPlayers({ type: 'LOBBY_UPDATE', players });
  return players;
}

// ── Role assignment ───────────────────────────────────────────────────────────

export function assignRoles(roleIds) {
  const players = _hostState.players.filter(p => p.connected);
  if (roleIds.length !== players.length) {
    return { ok: false, error: `Need ${players.length} roles, got ${roleIds.length}` };
  }

  const shuffledRoles = fisherYatesShuffle(roleIds);
  const wolfTeam = [];

  for (let i = 0; i < players.length; i++) {
    players[i].roleId = shuffledRoles[i];
    if (ROLES[shuffledRoles[i]]?.isWolf) wolfTeam.push(players[i].id);
  }

  _hostState.wolfTeam = wolfTeam;

  // Initialize per-role state
  _hostState.gunnerBullets = {};
  _hostState.witchState = {};
  for (const p of players) {
    if (p.roleId === 'gunner') _hostState.gunnerBullets[p.id] = 2;
    if (p.roleId === 'witch')  _hostState.witchState[p.id] = { healUsed: false, poisonUsed: false };
  }

  // Send each player their private role
  for (const p of players) {
    const role = ROLES[p.roleId];
    sendToPlayer(p.id, {
      type: 'YOUR_ROLE',
      roleId: p.roleId,
      faction: role.faction,
      nameVi: role.nameVi,
      nameEn: role.nameEn,
      factionLabel: role.factionLabel,
      timingLabel: role.timingLabel,
      timingClass: role.timingClass,
      abilityVi: role.abilityVi,
      abilityEn: role.abilityEn,
      svgIcon: role.svgIcon,
      hasNightAction: role.hasNightAction,
      hasDayAction: !!role.hasDayAction,
      hasHeal: !!role.hasHeal,
      hasPoison: !!role.hasPoison,
      onDeathShoot: !!role.onDeathShoot,
      doubleVote: !!role.doubleVote,
      winOnVoteElim: !!role.winOnVoteElim,
      isNightOneOnly: !!role.isNightOneOnly,
      bullets: role.bullets || 0,
    });
  }

  // Notify wolf team members of each other
  wolfTeam.forEach(id => {
    sendToPlayer(id, { type: 'WOLF_TEAM', memberIds: wolfTeam });
  });

  // Handle Amor — link two random non-amor players on night 1
  const amorPlayer = players.find(p => p.roleId === 'amor');
  if (amorPlayer) {
    const others = players.filter(p => p.id !== amorPlayer.id);
    if (others.length >= 2) {
      const shuffled = fisherYatesShuffle(others);
      const [a, b] = shuffled;
      _hostState.amorLink = [a.id, b.id];
      sendToPlayer(a.id, { type: 'AMOR_LINK', partnerId: b.id, partnerName: b.name });
      sendToPlayer(b.id, { type: 'AMOR_LINK', partnerId: a.id, partnerName: a.name });
    }
  }

  addLog(`🎭 Vai diễn đã được chia xong cho ${players.length} người chơi.`);
  return { ok: true };
}

// ── Phase control ─────────────────────────────────────────────────────────────

export function hostSetPhase(phase) {
  _hostState.phase = phase;
  if (phase === PHASE.NIGHT_INTRO || phase === PHASE.NIGHT_ACTIONS) {
    _hostState.round++;
    _hostState.nightActions = {};
    _hostState.trapTarget = null;
  }
  if (phase === PHASE.DAY_VOTE) {
    _hostState.votes = {};
  }

  broadcastToPlayers({ type: 'PHASE_CHANGE', phase, round: _hostState.round });
  return _hostState;
}

// ── Night action collection ───────────────────────────────────────────────────

export function hostReceiveNightAction(playerId, action) {
  _hostState.nightActions[playerId] = action;
}

export function hostReceiveGunnerShoot(playerId, targetId) {
  const target = _hostState.players.find(p => p.id === targetId);
  if (!target || !target.alive) return { ok: false };
  const remaining = (_hostState.gunnerBullets[playerId] || 0) - 1;
  if (remaining < 0) return { ok: false };
  _hostState.gunnerBullets[playerId] = remaining;

  const isWolf = ROLES[target.roleId]?.isWolf;
  addLog(`🔫 Xạ Thủ bắn ${target.name} — ${isWolf ? 'là Sói!' : 'không phải Sói.'}`);

  broadcastToPlayers({
    type: 'PHASE_CHANGE',
    phase: PHASE.ELIMINATION,
    round: _hostState.round,
    eliminatedId: targetId,
    revealRole: target.roleId,
    cause: 'gunner',
  });

  eliminatePlayer(targetId, 'gunner');
  checkWinConditions();
  return { ok: true, isWolf };
}

// ── Night resolution ──────────────────────────────────────────────────────────

export function resolveNight() {
  const actions = _hostState.nightActions;
  const players = _hostState.players;
  const findPlayer = id => players.find(p => p.id === id);

  let wolfKillTarget = null;
  let bodyguardProtect = null;
  let witchHeal = false;
  let witchKillTarget = null;
  let trapTrigger = null;
  let priestBlessed = null;
  const seerResults = {};

  // Collect actions
  for (const [pid, action] of Object.entries(actions)) {
    const p = findPlayer(pid);
    if (!p || !p.alive) continue;
    const role = ROLES[p.roleId];
    if (!role) continue;

    switch (p.roleId) {
      case 'werewolf':
      case 'alpha_wolf':
        if (action.type === 'WOLF_KILL') wolfKillTarget = action.targetId;
        if (action.type === 'ALPHA_CONVERT') {
          const target = findPlayer(action.targetId);
          if (target && target.alive && !ROLES[target.roleId]?.isWolf) {
            target.roleId = 'werewolf'; // convert them
            _hostState.wolfTeam.push(target.id);
            sendToPlayer(target.id, { type: 'CONVERTED', newRoleId: 'werewolf', ...ROLES.werewolf });
            addLog(`🐺 Sói Đầu Đàn chuyển hóa ${target.name} thành Sói!`);
            // Update wolf team for all wolves
            _hostState.wolfTeam.forEach(id =>
              sendToPlayer(id, { type: 'WOLF_TEAM', memberIds: _hostState.wolfTeam })
            );
          }
        }
        break;

      case 'bodyguard':
        if (action.type === 'PROTECT') {
          bodyguardProtect = action.targetId;
          _hostState.bodyguardLastProtect = action.targetId;
        }
        break;

      case 'witch':
        if (action.type === 'HEAL') {
          witchHeal = true;
          if (_hostState.witchState[pid]) _hostState.witchState[pid].healUsed = true;
        }
        if (action.type === 'POISON' && action.targetId) {
          witchKillTarget = action.targetId;
          if (_hostState.witchState[pid]) _hostState.witchState[pid].poisonUsed = true;
        }
        break;

      case 'trapper':
        if (action.type === 'TRAP') _hostState.trapTarget = action.targetId;
        break;

      case 'priest':
        if (action.type === 'BLESS') priestBlessed = action.targetId;
        break;

      case 'seer':
        if (action.type === 'CHECK' && action.targetId) {
          const target = findPlayer(action.targetId);
          if (target) {
            const r = ROLES[target.roleId];
            const isWolf = r?.isWolf || r?.appearsAsWolf;
            seerResults[pid] = { targetId: action.targetId, isWolf };
          }
        }
        break;

      case 'aura_seer':
        if (action.type === 'CHECK' && action.targetId) {
          const target = findPlayer(action.targetId);
          if (target) {
            const r = ROLES[target.roleId];
            const isEvil = r?.isWolf || r?.appearsEvilAura;
            seerResults[pid] = { targetId: action.targetId, aura: isEvil ? 'evil' : 'good' };
          }
        }
        break;

      case 'medium':
        // Medium sees a dead player's faction — send privately
        if (action.type === 'COMMUNE' && action.targetId) {
          const target = findPlayer(action.targetId);
          if (target && !target.alive) {
            const r = ROLES[target.roleId];
            sendToPlayer(pid, {
              type: 'MEDIUM_RESULT',
              targetName: target.name,
              faction: r?.faction,
              roleId: target.roleId,
            });
          }
        }
        break;
    }
  }

  // Resolve kills
  const deaths = [];

  // Trapper: if wolf attacked trap target, kill a wolf instead
  if (wolfKillTarget && _hostState.trapTarget === wolfKillTarget) {
    const attackingWolf = Object.entries(actions).find(([pid, a]) =>
      a.type === 'WOLF_KILL' && findPlayer(pid)?.alive
    )?.[0];
    if (attackingWolf) {
      deaths.push({ id: attackingWolf, cause: 'trap' });
      addLog(`🪤 Bẫy kích hoạt! ${findPlayer(attackingWolf)?.name} (Sói) bị tiêu diệt bởi bẫy.`);
      wolfKillTarget = null; // trap fired — wolf kill cancelled
    }
  }

  // Wolf kill (check bodyguard, witch heal, priest bless)
  if (wolfKillTarget) {
    const target = findPlayer(wolfKillTarget);
    const isProtected = bodyguardProtect === wolfKillTarget;
    const isHealed = witchHeal;
    const isBlessed = priestBlessed === wolfKillTarget;

    if (!isProtected && !isHealed && !isBlessed) {
      deaths.push({ id: wolfKillTarget, cause: 'wolf' });
    } else {
      addLog(`🛡️ ${target?.name} được bảo vệ đêm nay.`);
    }
  }

  // Witch poison
  if (witchKillTarget) {
    deaths.push({ id: witchKillTarget, cause: 'witch_poison' });
  }

  // Send seer/aura results
  for (const [pid, result] of Object.entries(seerResults)) {
    if (result.isWolf !== undefined) {
      sendToPlayer(pid, { type: 'SEER_RESULT', targetId: result.targetId, isWolf: result.isWolf });
    } else {
      sendToPlayer(pid, { type: 'AURA_RESULT', targetId: result.targetId, aura: result.aura });
    }
  }

  // Amor link deaths
  if (_hostState.amorLink) {
    const [a, b] = _hostState.amorLink;
    const aDeaths = deaths.some(d => d.id === a);
    const bDeaths = deaths.some(d => d.id === b);
    if (aDeaths && !bDeaths) deaths.push({ id: b, cause: 'amor' });
    if (bDeaths && !aDeaths) deaths.push({ id: a, cause: 'amor' });
  }

  // Hunter retaliation (wolf killed a hunter)
  for (const { id, cause } of [...deaths]) {
    const p = findPlayer(id);
    if (p && ROLES[p.roleId]?.onDeathShoot && cause === 'wolf') {
      sendToPlayer(id, { type: 'HUNTER_RETALIATE' });
    }
  }

  // Apply deaths
  const eliminatedNames = [];
  for (const { id, cause } of deaths) {
    eliminatePlayer(id, cause, false);
    eliminatedNames.push(findPlayer(id)?.name);
  }

  if (eliminatedNames.length) {
    addLog(`🌙 Đêm ${_hostState.round}: ${eliminatedNames.join(', ')} bị loại.`);
  } else {
    addLog(`🌙 Đêm ${_hostState.round}: Không ai bị loại.`);
  }

  const result = checkWinConditions();
  return { deaths, winResult: result };
}

// ── Voting ────────────────────────────────────────────────────────────────────

export function hostReceiveVote(voterId, targetId) {
  const voter = _hostState.players.find(p => p.id === voterId && p.alive);
  if (!voter) return;
  const weight = ROLES[voter.roleId]?.doubleVote ? 2 : 1;
  // Remove previous vote if exists
  if (voter._vote) {
    const prev = voter._vote;
    _hostState.votes[prev] = Math.max(0, (_hostState.votes[prev] || 0) - voter._voteWeight);
  }
  voter._vote = targetId;
  voter._voteWeight = weight;
  _hostState.votes[targetId] = (_hostState.votes[targetId] || 0) + weight;

  broadcastToPlayers({ type: 'VOTE_UPDATE', tally: { ..._hostState.votes } });
}

export function resolveVote() {
  const votes = _hostState.votes;
  let maxVotes = 0;
  let eliminated = null;

  for (const [id, count] of Object.entries(votes)) {
    if (count > maxVotes) { maxVotes = count; eliminated = id; }
  }

  if (!eliminated) return { eliminated: null };

  const target = _hostState.players.find(p => p.id === eliminated);
  if (!target) return { eliminated: null };

  const role = ROLES[target.roleId];
  broadcastToPlayers({
    type: 'VOTE_RESULT',
    eliminatedId: eliminated,
    votes: { ...votes },
    revealRole: target.roleId,
  });

  addLog(`☀️ Ngày ${_hostState.round}: Bỏ phiếu loại ${target.name} (${role?.nameVi}).`);

  // Jester wins if voted out
  if (role?.winOnVoteElim) {
    setTimeout(() => {
      broadcastToPlayers({ type: 'GAME_OVER', winner: 'jester', jesterName: target.name });
    }, 3000);
    return { eliminated, jesterWin: true };
  }

  // Hunter gets retaliation shot
  if (role?.onDeathShoot) {
    sendToPlayer(eliminated, { type: 'HUNTER_RETALIATE' });
  }

  eliminatePlayer(eliminated, 'vote');

  // Amor link
  if (_hostState.amorLink?.includes(eliminated)) {
    const [a, b] = _hostState.amorLink;
    const partnerId = a === eliminated ? b : a;
    const partner = _hostState.players.find(p => p.id === partnerId && p.alive);
    if (partner) {
      setTimeout(() => eliminatePlayer(partnerId, 'amor'), 1000);
    }
  }

  checkWinConditions();
  return { eliminated };
}

// ── Elimination ───────────────────────────────────────────────────────────────

export function eliminatePlayer(playerId, cause, broadcast = true) {
  const p = _hostState.players.find(p => p.id === playerId);
  if (!p || !p.alive) return;
  p.alive = false;
  if (broadcast) {
    broadcastToPlayers({
      type: 'PHASE_CHANGE',
      phase: PHASE.ELIMINATION,
      round: _hostState.round,
      eliminatedId: playerId,
      revealRole: p.roleId,
      cause,
    });
  }
}

// ── Win conditions ────────────────────────────────────────────────────────────

export function checkWinConditions() {
  const alivePlayers = _hostState.players.filter(p => p.alive);
  const aliveWolves = alivePlayers.filter(p => ROLES[p.roleId]?.isWolf);
  const aliveVillagers = alivePlayers.filter(p => !ROLES[p.roleId]?.isWolf);

  if (aliveWolves.length === 0) {
    broadcastToPlayers({ type: 'GAME_OVER', winner: 'village' });
    addLog('🏆 Phe Làng chiến thắng! Tất cả sói đã bị tiêu diệt.');
    return 'village';
  }

  if (aliveWolves.length >= aliveVillagers.length) {
    broadcastToPlayers({ type: 'GAME_OVER', winner: 'wolves' });
    addLog('🐺 Phe Sói chiến thắng!');
    return 'wolves';
  }

  // Amor: if both linked players are the only survivors
  if (_hostState.amorLink) {
    const [a, b] = _hostState.amorLink;
    if (alivePlayers.length === 2 && alivePlayers.find(p => p.id === a) && alivePlayers.find(p => p.id === b)) {
      broadcastToPlayers({ type: 'GAME_OVER', winner: 'amor' });
      addLog('💕 Đôi tình nhân chiến thắng — chỉ còn họ!');
      return 'amor';
    }
  }

  return null;
}

// ── Log ───────────────────────────────────────────────────────────────────────

function addLog(text) {
  _hostState.log.push({ text, ts: Date.now() });
}

export function getLog() { return _hostState.log; }

export function getPresetForCount(count) {
  return PRESETS[count] || PRESETS[9];
}
