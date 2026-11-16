import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { DevOverlay } from './DevOverlay';
import { metrics } from './metrics';

// Reanimated's frame callbacks need the native runtime; the overlay only has to mount it.
jest.mock('react-native-reanimated', () => ({ PerformanceMonitor: () => null }));

// The flags are read at render time. `__DEV__` is a plain global in Jest.
function setFlags(dev: boolean, envFlag: string | undefined) {
  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  if (envFlag === undefined) delete process.env.EXPO_PUBLIC_DEV_OVERLAY;
  else process.env.EXPO_PUBLIC_DEV_OVERLAY = envFlag;
}

const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;
const originalFlag = process.env.EXPO_PUBLIC_DEV_OVERLAY;

beforeEach(() => {
  jest.useFakeTimers();
  metrics.messages = 0;
  metrics.invalid = 0;
  metrics.reconnects = 0;
  metrics.gaps = 0;
  metrics.clockOffsetMs = 0;
  metrics.latency.length = 0;
  metrics.handlerMs.length = 0;
  metrics.flushes = 0;
});
afterEach(() => {
  jest.useRealTimers();
  setFlags(originalDev ?? true, originalFlag);
});

test('renders nothing when not in dev and the preview flag is off', async () => {
  setFlags(false, undefined);
  await render(<DevOverlay />);
  expect(screen.queryByTestId('dev-overlay-toggle')).toBeNull();
});

test('the preview flag EXPO_PUBLIC_DEV_OVERLAY=1 enables it outside dev; other values do not', async () => {
  setFlags(false, '1');
  const { unmount } = await render(<DevOverlay />);
  expect(screen.getByTestId('dev-overlay-toggle')).toBeTruthy();
  await unmount();

  setFlags(false, '0');
  await render(<DevOverlay />);
  expect(screen.queryByTestId('dev-overlay-toggle')).toBeNull();
});

test('the panel is closed at first, opens and closes on press', async () => {
  setFlags(true, undefined);
  await render(<DevOverlay />);
  expect(screen.queryByTestId('dev-overlay-panel')).toBeNull();

  await fireEvent.press(screen.getByTestId('dev-overlay-toggle'));
  expect(screen.getByTestId('dev-overlay-panel')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('dev-overlay-toggle'));
  expect(screen.queryByTestId('dev-overlay-panel')).toBeNull();
});

test('shows the counters and latency percentiles, refreshed once a second', async () => {
  setFlags(true, undefined);
  metrics.invalid = 2;
  metrics.reconnects = 1;
  metrics.gaps = 3;
  metrics.latency.push(...Array.from({ length: 100 }, (_, i) => i + 1)); // p50 = 50, p95 = 95
  await render(<DevOverlay />);
  await fireEvent.press(screen.getByTestId('dev-overlay-toggle'));

  expect(screen.getByText('msg/s -')).toBeTruthy(); // no full second yet
  expect(screen.getByText('invalid 2')).toBeTruthy();
  expect(screen.getByText('reconnects 1')).toBeTruthy();
  expect(screen.getByText('gaps 3')).toBeTruthy();
  expect(screen.getByText('latency p50 50 ms / p95 95 ms')).toBeTruthy();
  expect(screen.getByText('flush/s -')).toBeTruthy();
  expect(screen.getByText('tick p50 - / p95 -')).toBeTruthy();

  metrics.messages += 25;
  metrics.flushes += 5;
  metrics.handlerMs.push(...Array.from({ length: 100 }, (_, i) => (i + 1) / 100)); // p50 = 0.5, p95 = 0.95
  metrics.invalid = 5;
  await act(async () => {
    jest.advanceTimersByTime(1_000);
  });
  expect(screen.getByText('msg/s 25.0')).toBeTruthy();
  expect(screen.getByText('flush/s 5.0')).toBeTruthy();
  expect(screen.getByText('tick p50 0.50 ms / p95 0.95 ms')).toBeTruthy();
  expect(screen.getByText('invalid 5')).toBeTruthy();

  metrics.messages += 10;
  await act(async () => {
    jest.advanceTimersByTime(1_000);
  });
  expect(screen.getByText('msg/s 10.0')).toBeTruthy();
});

// Pressable and RNTL keep timers of their own, so count the overlay's interval through spies, not getTimerCount.
describe('the once-a-second poll', () => {
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  const overlayIntervals = () => setIntervalSpy.mock.calls.filter(([, ms]) => ms === 1_000);

  beforeEach(() => {
    setFlags(true, undefined);
    setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
  });
  afterEach(() => {
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  test('is not started while closed, starts on open and is cleared on close', async () => {
    await render(<DevOverlay />);
    expect(overlayIntervals()).toHaveLength(0);

    await fireEvent.press(screen.getByTestId('dev-overlay-toggle'));
    expect(overlayIntervals()).toHaveLength(1);
    const id = setIntervalSpy.mock.results[setIntervalSpy.mock.calls.findIndex(([, ms]) => ms === 1_000)]!.value;
    expect(clearIntervalSpy).not.toHaveBeenCalledWith(id);

    await fireEvent.press(screen.getByTestId('dev-overlay-toggle'));
    expect(clearIntervalSpy).toHaveBeenCalledWith(id);

    // closed: time passing changes nothing and nothing new is scheduled
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });
    expect(overlayIntervals()).toHaveLength(1);
  });

  test('unmounting while open clears the interval', async () => {
    const { unmount } = await render(<DevOverlay />);
    await fireEvent.press(screen.getByTestId('dev-overlay-toggle'));
    const id = setIntervalSpy.mock.results[setIntervalSpy.mock.calls.findIndex(([, ms]) => ms === 1_000)]!.value;

    await unmount();

    expect(clearIntervalSpy).toHaveBeenCalledWith(id);
  });
});

test('shows a dash for latency before any sample', async () => {
  setFlags(true, undefined);
  await render(<DevOverlay />);
  await fireEvent.press(screen.getByTestId('dev-overlay-toggle'));
  expect(screen.getByText('latency p50 - / p95 -')).toBeTruthy();
});
