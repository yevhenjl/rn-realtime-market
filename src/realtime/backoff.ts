// Full-jitter exponential backoff (AWS): delay = random() * min(cap, base * 2^attempt).
// Pure TS: no React or React Native imports.

export type BackoffOptions = { baseMs: number; maxMs: number };

export const DEFAULT_BACKOFF: BackoffOptions = { baseMs: 500, maxMs: 30_000 };

// 2 ** 10_000 is Infinity, and baseMs = 0 would give 0 * Infinity = NaN.
const MAX_EXPONENT = 30;

export function fullJitterDelay(
  attempt: number,
  opts: BackoffOptions = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number {
  const exponent = Math.min(Math.max(attempt, 0), MAX_EXPONENT);
  const ceiling = Math.min(opts.maxMs, opts.baseMs * 2 ** exponent);
  return Math.floor(random() * ceiling);
}
