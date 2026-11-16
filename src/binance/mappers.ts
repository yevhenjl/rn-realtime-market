// Wire message -> chart model. Pure TS: no React or React Native imports.
// Strings become numbers here, at the boundary (same as fetchKlines for REST rows).
import type { ChartCandle } from '@/chart/types';

import type { KlineMsg } from './schemas';

export function candleFromKline(m: KlineMsg): ChartCandle {
  const { k } = m;
  return { t: k.t, o: Number(k.o), h: Number(k.h), l: Number(k.l), c: Number(k.c), v: Number(k.v) };
}
