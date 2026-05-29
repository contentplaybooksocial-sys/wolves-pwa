// ── QR scanner — wraps getUserMedia + jsQR (global from vendor/jsQR.min.js) ──

// Opens a fullscreen overlay with the rear camera. Resolves with the first QR
// payload detected, or rejects if the user closes the overlay or denies access.
export async function scanQR({ promptText = 'Scan QR code', cancelText = 'Cancel' } = {}) {
  if (typeof jsQR === 'undefined') {
    throw new Error('jsQR library not loaded');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera not available on this device');
  }

  // Build overlay UI
  const overlay = document.createElement('div');
  overlay.className = 'qr-scanner-overlay';
  overlay.innerHTML = `
    <div class="qr-scanner-frame">
      <video class="qr-scanner-video" playsinline muted autoplay></video>
      <div class="qr-scanner-reticle"></div>
    </div>
    <p class="qr-scanner-prompt">${promptText}</p>
    <button class="btn btn-ghost qr-scanner-cancel">${cancelText}</button>
  `;
  document.body.appendChild(overlay);

  const video = overlay.querySelector('.qr-scanner-video');
  const cancelBtn = overlay.querySelector('.qr-scanner-cancel');
  let stream = null;
  let raf = 0;
  let canvas, ctx;
  let cleaned = false;

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    cancelAnimationFrame(raf);
    try { stream?.getTracks().forEach(t => t.stop()); } catch (_) {}
    try { overlay.remove(); } catch (_) {}
  }

  return new Promise(async (resolve, reject) => {
    cancelBtn.addEventListener('click', () => {
      cleanup();
      reject(new Error('Scan cancelled'));
    });

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch (err) {
      cleanup();
      return reject(err);
    }

    video.srcObject = stream;
    await video.play().catch(() => {});

    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      if (cleaned) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          cleanup();
          resolve(code.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
  });
}
