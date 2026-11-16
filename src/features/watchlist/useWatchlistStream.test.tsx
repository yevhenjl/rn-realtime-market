import { act, renderHook } from '@testing-library/react-native';

import { miniTicker, trade } from '@/binance/fixtures';
import { metrics } from '@/dev/metrics';
import { realtime } from '@/realtime/client';
import { useQuotes } from '@/store/quotesStore';

import { useWatchlistStream } from './useWatchlistStream';

type Listener = (data: unknown) => void;

const SYMBOLS = ['BTCUSDT', 'ETHUSDT'] as const;

describe('useWatchlistStream', () => {
  let listeners: Map<string, Listener>;
  let unsubscribers: Map<string, jest.Mock>;
  let subscribeSpy: jest.SpyInstance;

  const emit = (stream: string, data: unknown) => {
    const listener = listeners.get(stream);
    if (!listener) throw new Error(`not subscribed: ${stream}`);
    listener(data);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    metrics.invalid = 0;
    metrics.latency.length = 0;
    metrics.clockOffsetMs = 0;
    useQuotes.setState(useQuotes.getInitialState(), true);
    listeners = new Map();
    unsubscribers = new Map();
    subscribeSpy = jest.spyOn(realtime, 'subscribe').mockImplementation((stream, listener) => {
      listeners.set(stream, listener);
      const unsubscribe = jest.fn();
      unsubscribers.set(stream, unsubscribe);
      return unsubscribe;
    });
  });

  afterEach(() => {
    subscribeSpy.mockRestore();
    jest.useRealTimers();
  });

  it('subscribes one lowercase miniTicker stream per symbol', async () => {
    await renderHook(() => useWatchlistStream(SYMBOLS));

    expect(subscribeSpy.mock.calls.map(([stream]) => stream)).toEqual([
      'btcusdt@miniTicker',
      'ethusdt@miniTicker',
    ]);
  });

  it('stress mode also subscribes to trade streams', async () => {
    await renderHook(() => useWatchlistStream(SYMBOLS, true));

    const streams = subscribeSpy.mock.calls.map(([stream]) => stream);
    expect(streams).toHaveLength(4);
    expect(streams).toEqual(
      expect.arrayContaining(['btcusdt@trade', 'ethusdt@trade', 'btcusdt@miniTicker', 'ethusdt@miniTicker']),
    );
  });

  it('a valid miniTicker reaches the store only after one 200 ms batch', async () => {
    await renderHook(() => useWatchlistStream(SYMBOLS));

    emit('btcusdt@miniTicker', miniTicker);
    expect(useQuotes.getState().bySymbol.BTCUSDT).toBeUndefined();

    await act(async () => {
      jest.advanceTimersByTime(199);
    });
    expect(useQuotes.getState().bySymbol.BTCUSDT).toBeUndefined();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(useQuotes.getState().bySymbol.BTCUSDT).toEqual({
      symbol: 'BTCUSDT',
      eventTime: miniTicker.E,
      last: miniTicker.c,
      open: miniTicker.o,
      high: miniTicker.h,
      low: miniTicker.l,
      quoteVolume: miniTicker.q,
    });
  });

  it('puts a whole batch into the store in a single update', async () => {
    await renderHook(() => useWatchlistStream(SYMBOLS));
    const listener = jest.fn();
    const unsubscribe = useQuotes.subscribe(listener);

    emit('btcusdt@miniTicker', miniTicker);
    emit('ethusdt@miniTicker', { ...miniTicker, s: 'ETHUSDT', c: '3000.00' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(Object.keys(useQuotes.getState().bySymbol).sort()).toEqual(['BTCUSDT', 'ETHUSDT']);
    unsubscribe();
  });

  it('counts one metrics.flushes per batch written to the store', async () => {
    const before = metrics.flushes;
    await renderHook(() => useWatchlistStream(SYMBOLS));

    emit('btcusdt@miniTicker', miniTicker);
    emit('ethusdt@miniTicker', { ...miniTicker, s: 'ETHUSDT', c: '3000.00' });
    expect(metrics.flushes).toBe(before); // nothing written before the batch timer
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(metrics.flushes).toBe(before + 1);

    emit('btcusdt@miniTicker', { ...miniTicker, c: '73700.00000000' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(metrics.flushes).toBe(before + 2);
  });

  it('stress mode: a trade patch updates the price of a known ticker', async () => {
    await renderHook(() => useWatchlistStream(SYMBOLS, true));

    emit('btcusdt@miniTicker', miniTicker);
    emit('btcusdt@trade', { ...trade, E: miniTicker.E + 5, p: '73700.00000000' });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(useQuotes.getState().bySymbol.BTCUSDT).toMatchObject({
      last: '73700.00000000',
      open: miniTicker.o,
      eventTime: miniTicker.E + 5,
    });
  });

  it('drops invalid payloads without throwing', async () => {
    await renderHook(() => useWatchlistStream(SYMBOLS, true));

    expect(() => {
      emit('btcusdt@miniTicker', { ...miniTicker, c: 73607.75 }); // a number instead of a string
      emit('btcusdt@miniTicker', null);
      emit('btcusdt@miniTicker', 'garbage');
      emit('btcusdt@trade', { ...trade, e: 'kline' });
    }).not.toThrow();
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    expect(useQuotes.getState().bySymbol).toEqual({});
  });

  it('counts every dropped payload in metrics.invalid', async () => {
    await renderHook(() => useWatchlistStream(SYMBOLS, true));

    emit('btcusdt@miniTicker', { ...miniTicker, c: 73607.75 });
    emit('btcusdt@miniTicker', null);
    emit('btcusdt@trade', { ...trade, e: 'kline' });
    emit('btcusdt@miniTicker', miniTicker); // valid: not counted

    expect(metrics.invalid).toBe(3);
  });

  it('records latency from the event time E of a valid miniTicker only', async () => {
    jest.setSystemTime(miniTicker.E + 120);
    metrics.clockOffsetMs = 30;
    await renderHook(() => useWatchlistStream(SYMBOLS));

    emit('btcusdt@miniTicker', { ...miniTicker, c: 73607.75 }); // invalid: no sample
    expect(metrics.latency).toEqual([]);

    emit('btcusdt@miniTicker', miniTicker);
    expect(metrics.latency).toEqual([150]); // receivedAt + offset - E
  });

  it('flushMs = 0 applies ticks immediately', async () => {
    await renderHook(() => useWatchlistStream(SYMBOLS, false, 0));

    emit('btcusdt@miniTicker', miniTicker);

    expect(useQuotes.getState().bySymbol.BTCUSDT?.last).toBe(miniTicker.c);
  });

  it('unmount calls every unsubscriber and drops the pending batch', async () => {
    const { unmount } = await renderHook(() => useWatchlistStream(SYMBOLS, true));
    emit('btcusdt@miniTicker', miniTicker);

    await unmount();

    expect(unsubscribers.size).toBe(4);
    for (const unsubscribe of unsubscribers.values()) expect(unsubscribe).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(useQuotes.getState().bySymbol).toEqual({});
  });

  it('changing stress re-subscribes: old streams released, new set subscribed', async () => {
    const { rerender } = await renderHook(
      ({ stress }: { stress: boolean }) => useWatchlistStream(SYMBOLS, stress),
      { initialProps: { stress: false } },
    );
    expect(subscribeSpy).toHaveBeenCalledTimes(2);
    const firstUnsubscribers = [...unsubscribers.values()];

    await rerender({ stress: true });

    for (const unsubscribe of firstUnsubscribers) expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(subscribeSpy).toHaveBeenCalledTimes(2 + 4);
    expect(listeners.has('btcusdt@trade')).toBe(true);
  });

  it('a new array with the same symbols does not re-subscribe', async () => {
    const { rerender } = await renderHook(
      ({ symbols }: { symbols: readonly string[] }) => useWatchlistStream(symbols),
      { initialProps: { symbols: ['BTCUSDT', 'ETHUSDT'] as readonly string[] } },
    );

    await rerender({ symbols: ['BTCUSDT', 'ETHUSDT'] });

    expect(subscribeSpy).toHaveBeenCalledTimes(2);
  });

  it('does not start or stop the client', async () => {
    const start = jest.spyOn(realtime, 'start').mockImplementation(() => {});
    const stop = jest.spyOn(realtime, 'stop').mockImplementation(() => {});
    const { unmount } = await renderHook(() => useWatchlistStream(SYMBOLS));
    await unmount();

    expect(start).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
    start.mockRestore();
    stop.mockRestore();
  });
});
