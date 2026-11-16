/** "Nice" step 1, 2 or 5 x 10^k so that `span` holds about `maxTicks` ticks. 0 for a degenerate span. */
export function niceStep(span: number, maxTicks: number): number {
  'worklet';
  if (!(span > 0) || !(maxTicks > 0) || !Number.isFinite(span)) return 0;
  const raw = span / maxTicks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 + 1e-9 ? 1 : f <= 2 + 1e-9 ? 2 : f <= 5 + 1e-9 ? 5 : 10;
  return Number((nice * pow).toPrecision(12));
}

/** Number of decimals needed to print `step` exactly (capped at 12). */
export function stepDecimals(step: number): number {
  'worklet';
  if (!(step > 0) || !Number.isFinite(step)) return 0;
  let d = 0;
  while (d < 12) {
    const scaled = step * 10 ** d;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-9) break;
    d++;
  }
  return d;
}

/** Round values inside [min, max], free of float noise. Empty for a flat or invalid range. */
export function niceTicks(min: number, max: number, maxTicks = 5): number[] {
  'worklet';
  const step = niceStep(max - min, maxTicks);
  if (step === 0) return [];
  const decimals = stepDecimals(step);
  const ticks: number[] = [];
  for (let k = Math.ceil(min / step - 1e-9); k * step <= max + step * 1e-9; k++) {
    ticks.push(Number((k * step).toFixed(decimals)));
  }
  return ticks;
}

/** Display decimals by price magnitude. */
export function priceDigits(price: number): number {
  'worklet';
  if (price >= 1000) return 2;
  if (price >= 1) return 3;
  if (price >= 0.01) return 5;
  return 8;
}

/** Fixed-decimals string with thousands separators, no Intl. NaN/Infinity give an em dash. */
export function formatFixed(value: number, decimals: number): string {
  'worklet';
  if (!Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(decimals);
  const dot = fixed.indexOf('.');
  const int = dot === -1 ? fixed : fixed.slice(0, dot);
  const frac = dot === -1 ? '' : fixed.slice(dot);
  let grouped = '';
  for (let i = 0; i < int.length; i++) {
    if (i > 0 && (int.length - i) % 3 === 0) grouped += ',';
    grouped += int[i];
  }
  // No minus sign when the rounded value is zero ("-0.00").
  const sign = value < 0 && /[1-9]/.test(fixed) ? '-' : '';
  return sign + grouped + frac;
}
