import { act, render, screen } from '@testing-library/react-native';

import { ConnectionBanner } from './ConnectionBanner';
import { STALE_AFTER_MS, type BannerInput } from './getBannerState';

const T0 = new Date('2026-01-01T00:00:00Z').getTime();

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
});

afterEach(() => {
  jest.useRealTimers();
});

const open = (lastMessageAt: number | null): BannerInput => ({
  status: 'open',
  attempt: 0,
  lastMessageAt,
});

describe('ConnectionBanner', () => {
  it('shows the offline banner', async () => {
    await render(<ConnectionBanner connection={{ status: 'offline', attempt: 0, lastMessageAt: null }} />);

    expect(screen.getByTestId('connection-banner')).toBeOnTheScreen();
    expect(screen.getByText('No internet')).toBeOnTheScreen();
  });

  it('shows the reconnect attempt', async () => {
    await render(
      <ConnectionBanner connection={{ status: 'reconnecting', attempt: 2, lastMessageAt: T0 }} />,
    );

    expect(screen.getByText('Reconnecting (attempt 2)')).toBeOnTheScreen();
  });

  it('shows nothing when open with fresh data', async () => {
    await render(<ConnectionBanner connection={open(T0)} />);

    expect(screen.queryByTestId('connection-banner')).not.toBeOnTheScreen();
  });

  it('shows nothing when idle', async () => {
    await render(<ConnectionBanner connection={{ status: 'idle', attempt: 0, lastMessageAt: null }} />);

    expect(screen.queryByTestId('connection-banner')).not.toBeOnTheScreen();
  });

  it('turns stale as time advances', async () => {
    await render(<ConnectionBanner connection={open(T0)} />);
    expect(screen.queryByTestId('connection-banner')).not.toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(STALE_AFTER_MS + 1000);
    });

    expect(screen.getByText('Data is stale')).toBeOnTheScreen();
  });

  it('exposes alert semantics', async () => {
    await render(<ConnectionBanner connection={{ status: 'connecting', attempt: 0, lastMessageAt: null }} />);

    const banner = screen.getByTestId('connection-banner');
    expect(banner.props.accessibilityRole).toBe('alert');
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
  });

  it('clears the interval on unmount', async () => {
    // RN/RNTL keep their own fake timers, so assert on our interval specifically.
    const setSpy = jest.spyOn(globalThis, 'setInterval');
    const clearSpy = jest.spyOn(globalThis, 'clearInterval');
    await render(<ConnectionBanner connection={open(T0)} />);

    const ours = setSpy.mock.results.filter((_, i) => setSpy.mock.calls[i]?.[1] === 1000);
    expect(ours).toHaveLength(1);
    expect(clearSpy).not.toHaveBeenCalledWith(ours[0]?.value);

    await screen.unmount();

    expect(clearSpy).toHaveBeenCalledWith(ours[0]?.value);
    setSpy.mockRestore();
    clearSpy.mockRestore();
  });
});
