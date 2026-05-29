// ── Game State Machine ────────────────────────────────────────────────────────

export const PHASE = Object.freeze({
  SETUP:           'SETUP',
  LOBBY:           'LOBBY',
  NIGHT_INTRO:     'NIGHT_INTRO',
  NIGHT_ACTIONS:   'NIGHT_ACTIONS',
  NIGHT_RESOLVE:   'NIGHT_RESOLVE',
  DAY_INTRO:       'DAY_INTRO',
  DAY_DISCUSSION:  'DAY_DISCUSSION',
  DAY_VOTE:        'DAY_VOTE',
  VOTE_RESULT:     'VOTE_RESULT',
  ELIMINATION:     'ELIMINATION',
  GAME_OVER:       'GAME_OVER',
});

function makeState() {
  return {
    phase:       PHASE.SETUP,
    round:       0,
    isHost:      false,

    // Player list (shared/public info)
    players: [],   // [{ id, name, alive, connected }]

    // My private role (set on receiving YOUR_ROLE message)
    myRole: null,           // role object from ROLES
    myPlayerId: null,

    // Wolf team (only populated for wolf players)
    wolfTeamIds: [],

    // Amor link (only populated for linked players)
    amorPartnerId: null,

    // Voting state
    votes: {},    // { targetId: count }
    myVote: null,

    // Night actions submitted this round (player side)
    nightActionSubmitted: false,

    // Timer
    timerRemaining: 0,
    timerDuration: 0,

    // Game over
    winner: null,  // 'village' | 'wolves' | 'jester' | 'amor'

    // Host-only: assignments (never sent to clients wholesale)
    // These live in host.js state, not here — but we keep player list for UI.

    // Gunner bullets remaining (player-side tracking)
    gunnerBullets: 2,

    // Witch potions remaining (player-side tracking)
    witchHealUsed: false,
    witchPoisonUsed: false,
  };
}

let _state = null;
let _onStateChange = null;

export function initState(isHost, playerId, onStateChange) {
  _state = makeState();
  _state.isHost = isHost;
  _state.myPlayerId = playerId;
  _onStateChange = onStateChange;
  _notify();
}

function _notify() {
  if (_onStateChange) _onStateChange(getState());
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getState() {
  if (!_state) return null;
  return {
    phase:                _state.phase,
    round:                _state.round,
    isHost:               _state.isHost,
    players:              _state.players.map(p => ({ ...p })),
    myRole:               _state.myRole ? { ..._state.myRole } : null,
    myPlayerId:           _state.myPlayerId,
    wolfTeamIds:          [..._state.wolfTeamIds],
    amorPartnerId:        _state.amorPartnerId,
    votes:                { ..._state.votes },
    myVote:               _state.myVote,
    nightActionSubmitted: _state.nightActionSubmitted,
    timerRemaining:       _state.timerRemaining,
    timerDuration:        _state.timerDuration,
    winner:               _state.winner,
    gunnerBullets:        _state.gunnerBullets,
    witchHealUsed:        _state.witchHealUsed,
    witchPoisonUsed:      _state.witchPoisonUsed,
  };
}

export function getPhase() { return _state ? _state.phase : null; }

// ── Mutations (called by network message handlers) ────────────────────────────

export function setPhase(phase) {
  _state.phase = phase;
  _notify();
}

export function applyPhaseChange({ phase, round }) {
  _state.phase = phase;
  if (round !== undefined) _state.round = round;
  _state.nightActionSubmitted = false;
  _state.myVote = null;
  _notify();
}

export function applyLobbyUpdate({ players }) {
  _state.players = players.map(p => ({ ...p }));
  _notify();
}

export function applyMyRole(roleData) {
  _state.myRole = roleData;
  // Reset consumable state for new game
  _state.witchHealUsed = false;
  _state.witchPoisonUsed = false;
  _state.gunnerBullets = 2;
  _notify();
}

export function applyWolfTeam({ memberIds }) {
  _state.wolfTeamIds = memberIds;
  _notify();
}

export function applyAmorLink({ partnerId }) {
  _state.amorPartnerId = partnerId;
  _notify();
}

export function applyVoteUpdate({ tally }) {
  _state.votes = { ...tally };
  _notify();
}

export function applyVoteResult({ eliminatedId, votes }) {
  _state.votes = { ...votes };
  _notify();
}

export function applyElimination({ eliminatedId }) {
  const idx = _state.players.findIndex(p => p.id === eliminatedId);
  if (idx !== -1) _state.players[idx] = { ..._state.players[idx], alive: false };
  _notify();
}

export function applyGameOver({ winner }) {
  _state.winner = winner;
  _state.phase = PHASE.GAME_OVER;
  _notify();
}

export function applyTimerSync({ remaining, duration }) {
  _state.timerRemaining = remaining;
  if (duration !== undefined) _state.timerDuration = duration;
  _notify();
}

export function setMyVote(targetId) {
  _state.myVote = targetId;
  _notify();
}

export function setNightActionSubmitted() {
  _state.nightActionSubmitted = true;
  _notify();
}

export function useWitchHeal() {
  _state.witchHealUsed = true;
  _notify();
}

export function useWitchPoison() {
  _state.witchPoisonUsed = true;
  _notify();
}

export function useGunnerBullet() {
  if (_state.gunnerBullets > 0) _state.gunnerBullets--;
  _notify();
}

export function setPlayerConnected(playerId, connected) {
  const p = _state.players.find(p => p.id === playerId);
  if (p) { p.connected = connected; _notify(); }
}

export function resetState() {
  const { isHost, myPlayerId } = _state;
  _state = makeState();
  _state.isHost = isHost;
  _state.myPlayerId = myPlayerId;
  _notify();
}
