// Wolvesville PWA — local WebSocket signaling server + static file server
// Usage: node server.js
// Requires: npm install ws

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.svg':  'image/svg+xml',
};

// ── HTTP: serve static files ─────────────────────────────────────────────────

const httpServer = http.createServer((req, res) => {
  // Special endpoint: return LAN IP + port so client can build QR URL
  if (req.url === '/ip') {
    const ip = getLanIP();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ip, port: PORT }));
  }

  let urlPath = req.url.split('?')[0]; // strip query string
  if (urlPath === '/') urlPath = '/index.html';

  // Security: prevent path traversal
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found: ' + urlPath);
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// ── WebSocket: signaling relay ───────────────────────────────────────────────

// rooms: Map<roomCode, { hostWs: WebSocket|null, players: Map<playerId, WebSocket> }>
const rooms = new Map();

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let wsRoomCode = null;
  let wsPlayerId = null;
  let wsIsHost = false;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'HOST_REGISTER': {
        const code = msg.roomCode;
        if (!code) return;
        wsRoomCode = code;
        wsIsHost = true;
        rooms.set(code, { hostWs: ws, players: new Map() });
        console.log(`[room] created ${code}`);
        ws.send(JSON.stringify({ type: 'HOST_ACK', roomCode: code }));
        break;
      }

      case 'PLAYER_JOIN': {
        const { roomCode, playerId, playerName } = msg;
        if (!roomCode || !playerId) return;
        const room = rooms.get(roomCode);
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
          return;
        }
        wsRoomCode = roomCode;
        wsPlayerId = playerId;
        room.players.set(playerId, ws);
        console.log(`[room] ${playerId} (${playerName}) joined ${roomCode}`);
        // Notify host of new player
        if (room.hostWs && room.hostWs.readyState === 1) {
          room.hostWs.send(JSON.stringify({ type: 'NEW_PLAYER', playerId, playerName }));
        }
        ws.send(JSON.stringify({ type: 'JOIN_ACK', playerId }));
        break;
      }

      case 'SIGNAL': {
        // Relay SDP/ICE between host and a specific player
        const { to, from, data } = msg;
        const room = rooms.get(wsRoomCode);
        if (!room) return;

        if (to === 'HOST') {
          if (room.hostWs && room.hostWs.readyState === 1) {
            room.hostWs.send(JSON.stringify({ type: 'SIGNAL', from, data }));
          }
        } else {
          const playerWs = room.players.get(to);
          if (playerWs && playerWs.readyState === 1) {
            playerWs.send(JSON.stringify({ type: 'SIGNAL', from: 'HOST', data }));
          }
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!wsRoomCode) return;
    const room = rooms.get(wsRoomCode);
    if (!room) return;

    if (wsIsHost) {
      // Host disconnected — notify all players
      for (const [, pws] of room.players) {
        if (pws.readyState === 1) pws.send(JSON.stringify({ type: 'HOST_DISCONNECTED' }));
      }
      rooms.delete(wsRoomCode);
      console.log(`[room] ${wsRoomCode} closed (host left)`);
    } else if (wsPlayerId) {
      room.players.delete(wsPlayerId);
      if (room.hostWs && room.hostWs.readyState === 1) {
        room.hostWs.send(JSON.stringify({ type: 'PLAYER_LEFT', playerId: wsPlayerId }));
      }
      console.log(`[room] ${wsPlayerId} left ${wsRoomCode}`);
    }
  });

  ws.on('error', (err) => {
    console.warn('[ws] error:', err.message);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────

function getLanIP() {
  const { networkInterfaces } = require('os');
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

httpServer.listen(PORT, '0.0.0.0', () => {
  const ip = getLanIP();
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     🐺 Wolvesville Party Game          ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Host opens:  http://localhost:${PORT}     ║`);
  console.log(`║  Players:     http://${ip}:${PORT}  ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('Press Ctrl+C to stop.');
});
