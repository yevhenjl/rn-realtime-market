import { formatFixed, niceStep, niceTicks, priceDigits, stepDecimals } from './ticks';

test('niceStep: 1, 2 or 5 × 10^k', () => {
  expect(niceStep(200, 5)).toBe(50); // 40 → 50
  expect(niceStep(1, 5)).toBe(0.2);
  expect(niceStep(0.0005, 5)).toBe(0.0001);
  expect(niceStep(0, 5)).toBe(0);
});

test('niceTicks: round values inside [min, max]', () => {
  expect(niceTicks(84612.3, 84811.9, 5)).toEqual([84650, 84700, 84750, 84800]);
  expect(niceTicks(0.08321, 0.08369, 5)).toEqual([0.0833, 0.0834, 0.0835, 0.0836]); // без 0.08350000000000001
  expect(niceTicks(10, 10, 5)).toEqual([]);
});

test('stepDecimals and priceDigits', () => {
  expect([50, 1, 0.5, 0.05, 0.0001].map(stepDecimals)).toEqual([0, 0, 1, 2, 4]);
  expect([84710.6, 2.5, 0.08354, 0.000012].map(priceDigits)).toEqual([2, 3, 5, 8]);
});

test('formatFixed: thousands without Intl, no "-0.00"', () => {
  expect(formatFixed(84710.6, 2)).toBe('84,710.60');
  expect(formatFixed(1234567.891, 2)).toBe('1,234,567.89');
  expect(formatFixed(-1234.5, 1)).toBe('-1,234.5');
  expect(formatFixed(-0.0001, 2)).toBe('0.00');
  expect(formatFixed(999, 0)).toBe('999');
  expect(formatFixed(Number.NaN, 2)).toBe('—');
});
