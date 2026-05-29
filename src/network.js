// ── Network Layer — WebSocket signaling + SimplePeer WebRTC ──────────────────
// Host topology: star (hub-and-spoke). Each player has a direct channel to host.
// SimplePeer global is loaded from vendor/simplepeer.min.js.
//
// Two signaling modes:
//   1. SERVER mode: WebSocket relay via server.js (auto, fast — requires laptop/router)
//   2. OFFLINE mode: manual SDP exchange via QR scanning (no server, fully P2P)
//      Uses trickle: false so each side produces ONE complete SDP with all ICE
//      candidates batched — compressible into a single dense QR.

let _wsUrl = null;
let _ws = null;
let _roomCode = null;
let _myId = null;
let _isHost = false;

// host mode: Map<playerId, SimplePeer>
const _hostPeers = new Map();

// player mode: single SimplePeer to host
let _playerPeer = null;

let _onMessage = null;      // (msg, fromId) → void
let _onPlayerJoined = null; // (playerId, playerName) → void   [host only]
let _onPlayerLeft = null;   // (playerId) → void               [host only]
let _onConnected = null;    // () → void
let _onDisconnected = null; // () → void

export function initNetwork({ onMessage, onPlayerJoined, onPlayerLeft, onConnected, onDisconnected }) {
  _onMessage = onMessage;
  _onPlayerJoined = onPlayerJoined;
  _onPlayerLeft = onPlayerLeft;
  _onConnected = onConnected;
  _onDisconnected = onDisconnected;
}

// ── Host ──────────────────────────────────────────────────────────────────────

export async function hostStart(wsUrl, roomCode) {
  _wsUrl = wsUrl;
  _roomCode = roomCode;
  _isHost = true;
  _myId = 'HOST';
  await _connectWS();
  _wsSend({ type: 'HOST_REGISTER', roomCode });
}

// Called when server notifies a new player joined — create a SimplePeer and initiate
export function hostCreatePeerFor(playerId, playerName) {
  if (_hostPeers.has(playerId)) return;

  const peer = new SimplePeer({
    initiator: true,
    trickle: true,
    config: { iceServers: [] },
  });

  _hostPeers.set(playerId, peer);

  peer.on('signal', data => {
    _wsSend({ type: 'SIGNAL', to: playerId, from: 'HOST', data });
  });

  peer.on('connect', () => {
    console.log(`[network] P2P connected to player ${playerId}`);
    if (_onPlayerJoined) _onPlayerJoined(playerId, playerName);
  });

  peer.on('data', raw => {
    try {
      const msg = JSON.parse(raw);
      if (_onMessage) _onMessage(msg, playerId);
    } catch (_) {}
  });

  peer.on('close', () => {
    _hostPeers.delete(playerId);
    if (_onPlayerLeft) _onPlayerLeft(playerId);
  });

  peer.on('error', err => {
    console.warn(`[network] peer error for ${playerId}:`, err.message);
  });
}

// ── Player ────────────────────────────────────────────────────────────────────

export async function playerJoin(wsUrl, roomCode, myId, myName) {
  _wsUrl = wsUrl;
  _roomCode = roomCode;
  _myId = myId;
  _isHost = false;
  await _connectWS();
  _wsSend({ type: 'PLAYER_JOIN', roomCode, playerId: myId, playerName: myName });
}

function _playerCreatePeer() {
  if (_playerPeer) return;

  const peer = new SimplePeer({
    initiator: false,
    trickle: true,
    config: { iceServers: [] },
  });

  _playerPeer = peer;

  peer.on('signal', data => {
    _wsSend({ type: 'SIGNAL', to: 'HOST', from: _myId, data });
  });

  peer.on('connect', () => {
    console.log('[network] P2P connected to host');
    if (_onConnected) _onConnected();
  });

  peer.on('data', raw => {
    try {
      const msg = JSON.parse(raw);
      if (_onMessage) _onMessage(msg, 'HOST');
    } catch (_) {}
  });

  peer.on('close', () => {
    _playerPeer = null;
    if (_onDisconnected) _onDisconnected();
  });

  peer.on('error', err => {
    console.warn('[network] peer error:', err.message);
  });
}

// ── OFFLINE MODE: manual SDP exchange (no signaling server) ──────────────────
//
// Host flow (per player):
//   1. hostOfflineCreateOffer(playerId, playerName) → returns Promise<offerSDP>
//   2. Host shows offerSDP as QR
//   3. Player scans, creates answer (playerOfflineAcceptOffer)
//   4. Host calls hostOfflineAcceptAnswer(playerId, answerSDP)
//   5. peer.on('connect') fires → onPlayerJoined
//
// Player flow:
//   1. playerOfflineAcceptOffer(offerSDP, myId, myName) → returns Promise<answerSDP>
//   2. Player shows answerSDP as QR for host to scan
//   3. Connection establishes when host calls hostOfflineAcceptAnswer.

export function hostInitOfflineMode() {
  _isHost = true;
  _myId = 'HOST';
}

export function hostOfflineCreateOffer(playerId, playerName) {
  return new Promise((resolve, reject) => {
    if (_hostPeers.has(playerId)) {
      return reject(new Error('Already connecting to ' + playerId));
    }

    const peer = new SimplePeer({
      initiator: true,
      trickle: false, // batch all ICE candidates into the single SDP
      config: { iceServers: [] },
    });

    _hostPeers.set(playerId, peer);

    // ONE signal fires with the complete offer (since trickle is off)
    let resolved = false;
    peer.on('signal', data => {
      if (resolved) return;
      resolved = true;
      resolve(JSON.stringify(data));
    });

    peer.on('connect', () => {
      console.log(`[network] OFFLINE P2P connected to player ${playerId}`);
      if (_onPlayerJoined) _onPlayerJoined(playerId, playerName);
    });

    peer.on('data', raw => {
      try {
        const msg = JSON.parse(raw);
        if (_onMessage) _onMessage(msg, playerId);
      } catch (_) {}
    });

    peer.on('close', () => {
      _hostPeers.delete(playerId);
      if (_onPlayerLeft) _onPlayerLeft(playerId);
    });

    peer.on('error', err => {
      console.warn(`[network] offline peer error for ${playerId}:`, err.message);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    // Safety timeout: ICE gathering should finish in <5s on LAN
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('ICE gathering timed out'));
      }
    }, 15000);
  });
}

export function hostOfflineAcceptAnswer(playerId, answerSDP) {
  const peer = _hostPeers.get(playerId);
  if (!peer) throw new Error('No pending offer for player ' + playerId);
  const data = typeof answerSDP === 'string' ? JSON.parse(answerSDP) : answerSDP;
  peer.signal(data);
}

export function playerOfflineAcceptOffer(offerSDP, myId) {
  return new Promise((resolve, reject) => {
    _isHost = false;
    _myId = myId;

    if (_playerPeer) {
      try { _playerPeer.destroy(); } catch (_) {}
      _playerPeer = null;
    }

    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      config: { iceServers: [] },
    });

    _playerPeer = peer;

    let answerResolved = false;
    peer.on('signal', data => {
      if (answerResolved) return;
      answerResolved = true;
      resolve(JSON.stringify(data));
    });

    peer.on('connect', () => {
      console.log('[network] OFFLINE P2P connected to host');
      if (_onConnected) _onConnected();
    });

    peer.on('data', raw => {
      try {
        const msg = JSON.parse(raw);
        if (_onMessage) _onMessage(msg, 'HOST');
      } catch (_) {}
    });

    peer.on('close', () => {
      _playerPeer = null;
      if (_onDisconnected) _onDisconnected();
    });

    peer.on('error', err => {
      console.warn('[network] offline peer error:', err.message);
      if (!answerResolved) {
        answerResolved = true;
        reject(err);
      }
    });

    // Feed the offer
    try {
      const data = typeof offerSDP === 'string' ? JSON.parse(offerSDP) : offerSDP;
      peer.signal(data);
    } catch (err) {
      answerResolved = true;
      reject(err);
    }

    setTimeout(() => {
      if (!answerResolved) {
        answerResolved = true;
        reject(new Error('Failed to generate answer in time'));
      }
    }, 15000);
  });
}

// ── Send ──────────────────────────────────────────────────────────────────────

export function sendToPlayer(playerId, msg) {
  const peer = _hostPeers.get(playerId);
  if (peer && peer.connected) peer.send(JSON.stringify(msg));
}

export function broadcastToPlayers(msg) {
  const raw = JSON.stringify(msg);
  for (const peer of _hostPeers.values()) {
    if (peer.connected) peer.send(raw);
  }
}

export function sendToHost(msg) {
  if (_playerPeer && _playerPeer.connected) _playerPeer.send(JSON.stringify(msg));
}

export function getConnectedPlayerIds() {
  return [..._hostPeers.entries()]
    .filter(([, p]) => p.connected)
    .map(([id]) => id);
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

function _connectWS() {
  return new Promise((resolve, reject) => {
    _ws = new WebSocket(_wsUrl);

    _ws.addEventListener('open', () => {
      console.log('[network] WS connected');
      resolve();
    });

    _ws.addEventListener('message', e => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      _handleWSMessage(msg);
    });

    _ws.addEventListener('error', err => {
      console.warn('[network] WS error', err);
      reject(err);
    });

    _ws.addEventListener('close', () => {
      console.log('[network] WS closed');
    });
  });
}

function _handleWSMessage(msg) {
  switch (msg.type) {
    case 'HOST_ACK':
      console.log('[network] room registered:', msg.roomCode);
      break;

    case 'JOIN_ACK':
      // Host is about to send us a SDP offer via SIGNAL
      _playerCreatePeer();
      break;

    case 'NEW_PLAYER':
      // Host side: a new player connected via WS
      if (_isHost) hostCreatePeerFor(msg.playerId, msg.playerName);
      break;

    case 'PLAYER_LEFT':
      if (_isHost && _onPlayerLeft) _onPlayerLeft(msg.playerId);
      break;

    case 'SIGNAL':
      if (_isHost) {
        // Signal from a player → find their peer and forward
        const peer = _hostPeers.get(msg.from);
        if (peer) peer.signal(msg.data);
      } else {
        // Signal from host → our peer
        if (!_playerPeer) _playerCreatePeer();
        _playerPeer.signal(msg.data);
      }
      break;

    case 'HOST_DISCONNECTED':
      if (_onDisconnected) _onDisconnected();
      break;

    case 'ERROR':
      console.warn('[network] server error:', msg.message);
      break;
  }
}

function _wsSend(msg) {
  if (_ws && _ws.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify(msg));
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function disconnect() {
  for (const peer of _hostPeers.values()) { try { peer.destroy(); } catch (_) {} }
  _hostPeers.clear();
  if (_playerPeer) { try { _playerPeer.destroy(); } catch (_) {} _playerPeer = null; }
  if (_ws) { try { _ws.close(); } catch (_) {} _ws = null; }
  _roomCode = null;
  _myId = null;
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
