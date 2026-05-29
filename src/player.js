// ── Player-side logic ─────────────────────────────────────────────────────────
// Handles what individual players see and do during the game.

import { sendToHost } from './network.js';
import {
  getState, setNightActionSubmitted, setMyVote,
  useWitchHeal, useWitchPoison, useGunnerBullet,
} from './state.js';

// ── Night actions ─────────────────────────────────────────────────────────────

export function submitWolfKill(targetId) {
  // Wolves can change their pick freely until the host resolves night,
  // so we deliberately do NOT mark nightActionSubmitted here.
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'WOLF_KILL', targetId } });
}

export function submitAlphaConvert(targetId) {
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'ALPHA_CONVERT', targetId } });
  setNightActionSubmitted();
}

export function submitSeerCheck(targetId) {
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'CHECK', targetId } });
  setNightActionSubmitted();
}

export function submitAuraSeerCheck(targetId) {
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'CHECK', targetId } });
  setNightActionSubmitted();
}

export function submitBodyguardProtect(targetId) {
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'PROTECT', targetId } });
  setNightActionSubmitted();
}

export function submitWitchHeal() {
  const state = getState();
  if (state.witchHealUsed) return;
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'HEAL' } });
  useWitchHeal();
  setNightActionSubmitted();
}

export function submitWitchPoison(targetId) {
  const state = getState();
  if (state.witchPoisonUsed) return;
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'POISON', targetId } });
  useWitchPoison();
  setNightActionSubmitted();
}

export function submitTrap(targetId) {
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'TRAP', targetId } });
  setNightActionSubmitted();
}

export function submitPriestBless(targetId) {
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'BLESS', targetId } });
  setNightActionSubmitted();
}

export function submitMediumCommune(targetId) {
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'COMMUNE', targetId } });
  setNightActionSubmitted();
}

export function submitAmorLink(targetId1, targetId2) {
  sendToHost({ type: 'NIGHT_ACTION', action: { type: 'AMOR_LINK', targetId1, targetId2 } });
  setNightActionSubmitted();
}

// ── Day actions ───────────────────────────────────────────────────────────────

export function submitVote(targetId) {
  const state = getState();
  if (state.myVote === targetId) return;
  sendToHost({ type: 'VOTE', targetId });
  setMyVote(targetId);
}

export function submitGunnerShoot(targetId) {
  const state = getState();
  if (state.gunnerBullets <= 0) return;
  sendToHost({ type: 'GUNNER_SHOOT', targetId });
  useGunnerBullet();
}

export function submitHunterShoot(targetId) {
  sendToHost({ type: 'HUNTER_SHOT', targetId });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function canActThisPhase(phase) {
  const state = getState();
  if (!state.myRole) return false;
  if (!state.players.find(p => p.id === state.myPlayerId)?.alive) return false;

  const role = state.myRole;
  if (phase === 'NIGHT_ACTIONS') return role.hasNightAction && !state.nightActionSubmitted;
  if (phase === 'DAY_VOTE') return true;
  return false;
}

export function getMyPlayerRecord() {
  const state = getState();
  return state.players.find(p => p.id === state.myPlayerId) || null;
}

export function isAlive() {
  const p = getMyPlayerRecord();
  return p ? p.alive : true;
}
