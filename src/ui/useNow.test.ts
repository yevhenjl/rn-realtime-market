import { act, renderHook } from '@testing-library/react-native';

import { useNow } from './useNow';

const T0 = new Date('2026-01-01T00:00:00Z').getTime();

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
});

afterEach(() => {
  jest.useRealTimers();
});

// RN/RNTL keep their own fake timers, so observe our interval via spies on the global.
const ownIntervals = (spy: jest.SpyInstance, ms: number) => spy.mock.calls.filter((call) => call[1] === ms);

describe('useNow', () => {
  it('starts no interval while disabled', async () => {
    const setSpy = jest.spyOn(globalThis, 'setInterval');
    await renderHook(() => useNow(1000, false));

    expect(ownIntervals(setSpy, 1000)).toHaveLength(0);
    setSpy.mockRestore();
  });

  it('does not tick while disabled', async () => {
    const { result } = await renderHook(() => useNow(1000, false));
    const first = result.current;

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current).toBe(first);
  });

  it('ticks while enabled (default)', async () => {
    const { result } = await renderHook(() => useNow(1000));
    expect(result.current).toBe(T0);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current).toBe(T0 + 3000);
  });

  it('returns a fresh value right after re-enabling', async () => {
    const { result, rerender } = await renderHook(({ enabled }: { enabled: boolean }) => useNow(1000, enabled), {
      initialProps: { enabled: false },
    });
    expect(result.current).toBe(T0);

    // Hours pass while disabled: nothing updates the value.
    await act(async () => {
      jest.setSystemTime(T0 + 3 * 3600_000);
    });
    expect(result.current).toBe(T0);

    await rerender({ enabled: true });

    expect(result.current).toBe(T0 + 3 * 3600_000);
  });

  it('stops ticking and freezes the value when disabled again', async () => {
    const { result, rerender } = await renderHook(({ enabled }: { enabled: boolean }) => useNow(1000, enabled), {
      initialProps: { enabled: true },
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(T0 + 2000);

    await rerender({ enabled: false });
    const frozen = result.current;

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current).toBe(frozen);
  });
});
