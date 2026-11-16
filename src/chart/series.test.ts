import { aggregate, applyTick, upsertCandle } from './series';
import type { ChartCandle } from './types';

const M = 60_000;
const H = 3_600_000;
const k = (t: number, c: number): ChartCandle => ({ t, o: c, h: c, l: c, c, v: 1 });

test('upsertCandle: same t replaces, t + interval rolls over, older is ignored, a hole is a gap', () => {
  let r = upsertCandle([], k(0, 1), M);
  expect(r.kind).toBe('appended');
  r = upsertCandle(r.list, k(0, 2), M);
  expect(r).toEqual({ list: [k(0, 2)], kind: 'replaced' });
  r = upsertCandle(r.list, k(M, 3), M, 1); // rollover; max = 1 обрезает хвост
  expect(r).toEqual({ list: [k(M, 3)], kind: 'appended' });
  const list = r.list;
  expect(upsertCandle(list, k(0, 9), M).kind).toBe('stale');
  expect(upsertCandle(list, k(0, 9), M).list).toBe(list); // та же ссылка — без ре-рендера
  expect(upsertCandle(list, k(3 * M, 4), M)).toEqual({ list, kind: 'gap' }); // нет свечи 2M → история по REST
});

test('applyTick: price ticks build candles of the interval', () => {
  let s = applyTick([], 100, 10 * H + 5, H);
  expect(s).toEqual([{ t: 10 * H, o: 100, h: 100, l: 100, c: 100, v: 0 }]);
  s = applyTick(s, 103, 10 * H + M, H);
  s = applyTick(s, 99, 10 * H + 2 * M, H);
  expect(s).toEqual([{ t: 10 * H, o: 100, h: 103, l: 99, c: 99, v: 0 }]);
  expect(applyTick(s, 99, 10 * H + 3 * M, H)).toBe(s); // цена та же — та же ссылка
  expect(applyTick(s, 50, 9 * H, H)).toBe(s); // опоздавший тик
  s = applyTick(s, 101, 11 * H, H, 1); // новый час; max = 1
  expect(s).toEqual([{ t: 11 * H, o: 101, h: 101, l: 101, c: 101, v: 0 }]);
});

test('aggregate: 1m × 5 → 5m', () => {
  const list = [0, 1, 2, 3, 4, 5].map((i) => ({ t: i * M, o: 10 + i, h: 20 + i, l: 5 - i, c: 11 + i, v: 1 }));
  expect(aggregate(list, M, 5)).toEqual([
    { t: 0, o: 10, h: 24, l: 1, c: 15, v: 5 },
    { t: 5 * M, o: 15, h: 25, l: 0, c: 16, v: 1 },
  ]);
});
