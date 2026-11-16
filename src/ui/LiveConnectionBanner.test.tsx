import { act, render, screen } from '@testing-library/react-native';

import { useConnection } from '@/store/connectionStore';

import { LiveConnectionBanner } from './LiveConnectionBanner';

const T0 = new Date('2026-01-01T00:00:00Z').getTime();

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useConnection.setState({ status: 'idle', attempt: 0, lastMessageAt: null });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('LiveConnectionBanner', () => {
  it('shows no banner while idle', async () => {
    await render(<LiveConnectionBanner />);

    expect(screen.queryByTestId('connection-banner')).not.toBeOnTheScreen();
  });

  it('shows and hides the offline banner as the store changes', async () => {
    await render(<LiveConnectionBanner />);

    await act(async () => {
      useConnection.setState({ status: 'offline' });
    });
    expect(screen.getByText('No internet')).toBeOnTheScreen();

    await act(async () => {
      useConnection.setState({ status: 'idle' });
    });
    expect(screen.queryByTestId('connection-banner')).not.toBeOnTheScreen();
  });

  it('shows the reconnect attempt from the store', async () => {
    await render(<LiveConnectionBanner />);

    await act(async () => {
      useConnection.setState({ status: 'reconnecting', attempt: 2 });
    });

    expect(screen.getByText('Reconnecting (attempt 2)')).toBeOnTheScreen();
  });

  it('turns stale when an open connection goes quiet', async () => {
    await render(<LiveConnectionBanner />);

    await act(async () => {
      useConnection.setState({ status: 'open', attempt: 0, lastMessageAt: T0 });
    });
    expect(screen.queryByTestId('connection-banner')).not.toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(31_000);
    });

    expect(screen.getByText('Data is stale')).toBeOnTheScreen();
  });
});
