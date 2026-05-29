// ── SDP codec — compress + base64 so SDPs fit in a single QR ─────────────────
// Modern browsers (Safari 16.4+, all others) support CompressionStream.
// Falls back to raw base64 if compression is unavailable.

async function gzipString(s) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Response(s).body.pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function gunzipBytes(bytes) {
  if (typeof DecompressionStream === 'undefined') return null;
  const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Encode an SDP string into the shortest possible QR-safe text.
// Output format:  "Z" + base64(gzip(sdp))  or  "R" + base64(sdp) as fallback.
export async function encodeSDP(sdpJson) {
  const gz = await gzipString(sdpJson);
  if (gz) return 'Z' + bytesToBase64(gz);
  return 'R' + btoa(sdpJson);
}

export async function decodeSDP(encoded) {
  if (!encoded || encoded.length < 2) throw new Error('Empty SDP payload');
  const prefix = encoded[0];
  const body = encoded.slice(1);
  if (prefix === 'Z') {
    const text = await gunzipBytes(base64ToBytes(body));
    if (!text) throw new Error('No DecompressionStream support');
    return text;
  }
  if (prefix === 'R') {
    return atob(body);
  }
  throw new Error('Unknown SDP encoding prefix: ' + prefix);
}
