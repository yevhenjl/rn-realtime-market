import { useShallow } from 'zustand/react/shallow';

import { useQuotes } from '@/store/quotesStore';

/**
 * Last price and 24h open of one symbol, as strings. Field selectors with useShallow: the store emits
 * a new ticker object about once a second even when the values are equal, but the
 * component re-renders only when `last` or `open` actually change.
 */
export function useTicker(symbol: string): { last: string | undefined; open: string | undefined } {
  return useQuotes(
    useShallow((s) => {
      const t = s.bySymbol[symbol];
      return { last: t?.last, open: t?.open };
    }),
  );
}
