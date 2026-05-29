// Thin wrapper around the vendored qrcode-generator library.
// qrcode-generator sets window.qrcode (non-module UMD).

export function renderQR(canvas, text, ecLevel = 'M') {
  if (typeof qrcode === 'undefined') {
    console.warn('[qr] qrcode library not loaded');
    return;
  }

  // ecLevel: 'L' (7%), 'M' (15%), 'Q' (25%), 'H' (30%)
  // Use 'L' for large payloads (SDPs) — max capacity, still scannable on phones
  const qr = qrcode(0, ecLevel);
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const size = canvas.width || 180;
  const cellSize = Math.floor(size / moduleCount);
  const offset = Math.floor((size - cellSize * moduleCount) / 2);

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(
          offset + col * cellSize,
          offset + row * cellSize,
          cellSize,
          cellSize,
        );
      }
    }
  }
}
