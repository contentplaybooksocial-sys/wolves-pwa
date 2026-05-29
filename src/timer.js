// ── Timer ─────────────────────────────────────────────────────────────────────

export function createTimer(duration, onTick, onExpire) {
  let remaining = duration;
  let intervalId = null;

  function start() {
    if (intervalId) return;
    intervalId = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      onTick(remaining);
      if (remaining === 0) {
        clearInterval(intervalId);
        intervalId = null;
        onExpire();
      }
    }, 1000);
  }

  function pause() {
    clearInterval(intervalId);
    intervalId = null;
  }

  function reset(d = duration) {
    pause();
    remaining = d;
    onTick(remaining);
  }

  function set(r) {
    remaining = r;
    onTick(remaining);
  }

  return { start, pause, reset, set, get remaining() { return remaining; } };
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : String(s);
}
