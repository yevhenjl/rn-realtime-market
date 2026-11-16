import { priceDigits } from '../../chart/ticks';

const DASH = '—';

// One formatter per digit count, created lazily and reused for every call.
const priceFormatters = new Map<number, Intl.NumberFormat>();

function getPriceFormatter(digits: number): Intl.NumberFormat {
  let formatter = priceFormatters.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    priceFormatters.set(digits, formatter);
  }
  return formatter;
}

function parse(value: string): number {
  // Number('') is 0; an empty string is not a price.
  return value.trim() === '' ? NaN : Number(value);
}

export function formatPrice(value: string): string {
  const price = parse(value);
  if (!Number.isFinite(price)) return DASH;
  return getPriceFormatter(priceDigits(price)).format(price);
}

/** Percent change of `last` vs `open`, rounded to 2 decimals. null when it cannot be computed. */
export function changePct(last: string, open: string): number | null {
  const lastPrice = parse(last);
  const openPrice = parse(open);
  if (!Number.isFinite(lastPrice) || !Number.isFinite(openPrice) || openPrice === 0) return null;
  return Math.round(((lastPrice - openPrice) / openPrice) * 10000) / 100;
}

// Sign is added by hand: Hermes on iOS lacks Intl `signDisplay`.
export function formatPct(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return DASH;
  // `=== 0` is also true for -0, so a rounded-away change never shows a sign.
  if (pct === 0) return '0.00%';
  return `${pct > 0 ? '+' : '-'}${Math.abs(pct).toFixed(2)}%`;
}
