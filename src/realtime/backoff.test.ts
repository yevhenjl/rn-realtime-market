import { fullJitterDelay } from './backoff';

const opts = { baseMs: 500, maxMs: 30_000 };

test('the cap doubles with every attempt and stops at maxMs', () => {
  const half = () => 0.5;
  expect([0, 1, 2, 3, 5, 6, 20].map((a) => fullJitterDelay(a, opts, half))).toEqual([
    250, 500, 1000, 2000, 8000, 15_000, 15_000, // 500 × 2^6 = 32 000 → потолок 30 000
  ]);
});

test('full jitter: from 0 up to (not including) the cap', () => {
  expect(fullJitterDelay(3, opts, () => 0)).toBe(0);
  expect(fullJitterDelay(3, opts, () => 0.999_999)).toBe(3999);
});

test('a huge attempt number does not produce Infinity or NaN', () => {
  expect(fullJitterDelay(10_000, opts, () => 0.5)).toBe(15_000);
});
