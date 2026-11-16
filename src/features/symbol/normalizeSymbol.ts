// Route param -> Binance symbol (uppercase), or null if it cannot be a symbol.
// Binance symbols are 2-20 ASCII letters/digits (BTCUSDT, 1000SATSUSDT). Whether the pair exists is
// Binance's call: an unknown pair comes back as HTTP 400 -1121 and the screen shows the error.
const SYMBOL_RE = /^[A-Z0-9]{2,20}$/;

export function normalizeSymbol(param: string | string[] | undefined): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  const symbol = raw?.trim().toUpperCase();
  return symbol !== undefined && SYMBOL_RE.test(symbol) ? symbol : null;
}
