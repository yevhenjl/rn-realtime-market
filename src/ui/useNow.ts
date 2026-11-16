import { useEffect, useState } from 'react';

/**
 * Current time, re-read every `intervalMs` while `enabled`. Keeps Date.now() out of render.
 * Disabled: no interval runs. Re-enabled: the value is refreshed right away, not left hours old.
 */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);

  return now;
}
