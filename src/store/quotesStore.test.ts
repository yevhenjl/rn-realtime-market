import { useQuotes } from './quotesStore';
import type { Ticker } from './types';

const t = (symbol: string, eventTime: number, last: string): Ticker => ({
  symbol, eventTime, last, open: '100', high: '110', low: '90', quoteVolume: '1000',
});

beforeEach(() => useQuotes.setState(useQuotes.getInitialState(), true));

test('a batch creates new objects only for changed symbols', () => {
  const { applySnapshot, applyBatch } = useQuotes.getState();
  applySnapshot([t('BTCUSDT', 1, '100'), t('ETHUSDT', 1, '10')]);
  const eth = useQuotes.getState().bySymbol.ETHUSDT;
  applyBatch(new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 2, last: '101' }]]));
  const s = useQuotes.getState().bySymbol;
  expect(s.BTCUSDT).toMatchObject({ last: '101', open: '100' }); // patch слит с текущим
  expect(s.ETHUSDT).toBe(eth); // та же ссылка → подписчики ETH ничего не делают
});

test('an older snapshot does not overwrite a newer tick; a partial patch before the snapshot is dropped', () => {
  const { applySnapshot, applyBatch } = useQuotes.getState();
  applyBatch(new Map([['SOLUSDT', { symbol: 'SOLUSDT', eventTime: 5, last: '108' }]]));
  expect(useQuotes.getState().bySymbol.SOLUSDT).toBeUndefined();
  applyBatch(new Map([['BTCUSDT', t('BTCUSDT', 10, '105')]]));
  applySnapshot([t('BTCUSDT', 9, '100')]);
  expect(useQuotes.getState().bySymbol.BTCUSDT?.last).toBe('105');
});

test('nothing changed → no notification', () => {
  const listener = jest.fn();
  useQuotes.getState().applySnapshot([t('BTCUSDT', 10, '100')]);
  const unsub = useQuotes.subscribe(listener);
  useQuotes.getState().applySnapshot([t('BTCUSDT', 9, '99')]);
  expect(listener).not.toHaveBeenCalled();
  unsub();
});

// --- additional tests ---

test('a full Ticker patch with no prior entry creates it', () => {
  const full = t('BTCUSDT', 3, '100');
  useQuotes.getState().applyBatch(new Map([['BTCUSDT', full]]));
  expect(useQuotes.getState().bySymbol.BTCUSDT).toEqual(full);
});

test('a newer partial patch merges into the existing entry', () => {
  const { applySnapshot, applyBatch } = useQuotes.getState();
  applySnapshot([t('BTCUSDT', 1, '100')]);
  applyBatch(new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 5, last: '120', high: '121' }]]));
  expect(useQuotes.getState().bySymbol.BTCUSDT).toEqual({
    symbol: 'BTCUSDT', eventTime: 5, last: '120', open: '100', high: '121', low: '90', quoteVolume: '1000',
  });
});

test('same snapshot content with the same eventTime keeps the reference and does not notify', () => {
  useQuotes.getState().applySnapshot([t('BTCUSDT', 10, '100')]);
  const before = useQuotes.getState();
  const listener = jest.fn();
  const unsub = useQuotes.subscribe(listener);
  useQuotes.getState().applySnapshot([t('BTCUSDT', 10, '100')]);
  expect(useQuotes.getState()).toBe(before);
  expect(useQuotes.getState().bySymbol.BTCUSDT).toBe(before.bySymbol.BTCUSDT);
  expect(listener).not.toHaveBeenCalled();
  unsub();
});

test('a patch whose fields equal the current values (same eventTime) is a no-op', () => {
  useQuotes.getState().applySnapshot([t('BTCUSDT', 10, '100')]);
  const before = useQuotes.getState();
  useQuotes.getState().applyBatch(new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 10, last: '100', open: '100' }]]));
  expect(useQuotes.getState()).toBe(before);
});

test('equal eventTime with different fields is applied (miniTicker and trade can share E)', () => {
  useQuotes.getState().applySnapshot([t('BTCUSDT', 10, '100')]);
  useQuotes.getState().applyBatch(new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 10, last: '101' }]]));
  expect(useQuotes.getState().bySymbol.BTCUSDT).toMatchObject({ eventTime: 10, last: '101', open: '100' });
});

test('a newer eventTime with identical values still advances eventTime (guards against late events)', () => {
  const { applySnapshot, applyBatch } = useQuotes.getState();
  applySnapshot([t('BTCUSDT', 10, '100')]);
  applyBatch(new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 12, last: '100' }]]));
  expect(useQuotes.getState().bySymbol.BTCUSDT?.eventTime).toBe(12);
  applyBatch(new Map([['BTCUSDT', { symbol: 'BTCUSDT', eventTime: 11, last: '99' }]]));
  expect(useQuotes.getState().bySymbol.BTCUSDT?.last).toBe('100');
});

test('applySnapshot with several symbols: unchanged ones keep their references', () => {
  const { applySnapshot } = useQuotes.getState();
  applySnapshot([t('BTCUSDT', 1, '100'), t('ETHUSDT', 1, '10'), t('SOLUSDT', 1, '5')]);
  const before = useQuotes.getState().bySymbol;
  applySnapshot([t('BTCUSDT', 1, '100'), t('ETHUSDT', 2, '11'), t('SOLUSDT', 1, '5')]);
  const after = useQuotes.getState().bySymbol;
  expect(after.ETHUSDT).not.toBe(before.ETHUSDT);
  expect(after.ETHUSDT?.last).toBe('11');
  expect(after.BTCUSDT).toBe(before.BTCUSDT);
  expect(after.SOLUSDT).toBe(before.SOLUSDT);
});

test('an empty batch and an empty snapshot do not notify', () => {
  const listener = jest.fn();
  const unsub = useQuotes.subscribe(listener);
  useQuotes.getState().applyBatch(new Map());
  useQuotes.getState().applySnapshot([]);
  expect(listener).not.toHaveBeenCalled();
  unsub();
});

test('the patch key and patch.symbol are taken from the patch itself (map key is not trusted)', () => {
  useQuotes.getState().applyBatch(new Map([['x', t('BTCUSDT', 1, '1')]]));
  expect(useQuotes.getState().bySymbol.BTCUSDT).toBeDefined();
  expect(useQuotes.getState().bySymbol.x).toBeUndefined();
});
