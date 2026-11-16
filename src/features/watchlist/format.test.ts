import { changePct, formatPct, formatPrice } from './format';

test('price digits depend on the price level', () => {
  expect(formatPrice('84710.60000000')).toBe('84,710.60');
  expect(formatPrice('2.50000000')).toBe('2.500');
  expect(formatPrice('0.08354000')).toBe('0.08354');
  expect(formatPrice('abc')).toBe('—');
});

test('24h change: sign, rounding, no "-0.00"', () => {
  expect(changePct('84710.6', '82425.35')).toBe(2.77);
  expect(formatPct(changePct('84710.6', '82425.35'))).toBe('+2.77%');
  expect(formatPct(changePct('99', '100'))).toBe('-1.00%');
  expect(formatPct(changePct('99.999', '100'))).toBe('0.00%');
  expect(formatPct(changePct('1', '0'))).toBe('—');
});

test('formatPct never shows a signed zero, even for -0 and tiny positives', () => {
  expect(formatPct(-0)).toBe('0.00%');
  expect(formatPct(0)).toBe('0.00%');
  expect(formatPct(changePct('100.001', '100'))).toBe('0.00%');
  expect(formatPct(null)).toBe('—');
});

test('changePct returns null for non-finite input', () => {
  expect(changePct('abc', '100')).toBeNull();
  expect(changePct('100', 'abc')).toBeNull();
  expect(changePct('', '100')).toBeNull();
});

test('formatPrice treats an empty string as non-numeric', () => {
  expect(formatPrice('')).toBe('—');
});
