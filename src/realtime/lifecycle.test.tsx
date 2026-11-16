import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useRealtimeLifecycle } from './lifecycle';

type NetListener = (state: NetInfoState) => void;

// currentState is a plain data property in the jest AppState mock: assign it and restore after each test.
const originalCurrentState = AppState.currentState;
const setCurrentState = (s: string | null | undefined) => {
  Object.defineProperty(AppState, 'currentState', {
    value: s,
    configurable: true,
    writable: true,
  });
};

const netState = (isConnected: boolean | null) => ({ isConnected }) as NetInfoState;

describe('useRealtimeLifecycle', () => {
  let appStateHandler: (s: AppStateStatus) => void;
  let appStateRemove: jest.Mock;
  let netListener: NetListener;
  let netUnsubscribe: jest.Mock;
  const client = { start: jest.fn(), stop: jest.fn() };

  const setAppState = (s: AppStateStatus) =>
    act(async () => {
      appStateHandler(s);
    });
  const setNet = (c: boolean | null) =>
    act(async () => {
      netListener(netState(c));
    });

  beforeEach(() => {
    client.start.mockClear();
    client.stop.mockClear();
    jest.mocked(NetInfo.addEventListener).mockClear();
    appStateRemove = jest.fn();
    netUnsubscribe = jest.fn();
    setCurrentState('active');
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateHandler = handler;
      return { remove: appStateRemove };
    });
    jest.mocked(NetInfo.addEventListener).mockImplementation((listener) => {
      netListener = listener;
      return netUnsubscribe;
    });
  });

  afterEach(() => {
    setCurrentState(originalCurrentState);
    jest.restoreAllMocks();
  });

  it('starts on mount when active and network is unknown', async () => {
    await renderHook(() => useRealtimeLifecycle(client));

    expect(client.start).toHaveBeenCalledTimes(1);
    expect(client.stop).not.toHaveBeenCalled();
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('stops with offline when the network drops and starts again when it is back', async () => {
    await renderHook(() => useRealtimeLifecycle(client));
    client.start.mockClear();

    await setNet(false);
    expect(client.stop).toHaveBeenCalledWith('offline');
    expect(client.start).not.toHaveBeenCalled();

    await setNet(true);
    expect(client.start).toHaveBeenCalledTimes(1);
  });

  it('stops with idle in background and starts when active again', async () => {
    await renderHook(() => useRealtimeLifecycle(client));
    client.start.mockClear();

    await setAppState('background');
    expect(client.stop).toHaveBeenCalledWith('idle');

    await setAppState('active');
    expect(client.start).toHaveBeenCalledTimes(1);
  });

  it('does not touch the client on inactive', async () => {
    await renderHook(() => useRealtimeLifecycle(client));
    client.start.mockClear();

    await setAppState('inactive');

    expect(client.start).not.toHaveBeenCalled();
    expect(client.stop).not.toHaveBeenCalled();
  });

  it('does not repeat client calls while the decision is unchanged', async () => {
    await renderHook(() => useRealtimeLifecycle(client));
    client.start.mockClear();

    await setNet(true);
    await setNet(null);
    await setAppState('inactive');
    await setAppState('active');
    expect(client.start).not.toHaveBeenCalled();

    await setNet(false);
    await setNet(false);
    expect(client.stop).toHaveBeenCalledTimes(1);
  });

  it('background wins over offline: going offline in background keeps idle', async () => {
    await renderHook(() => useRealtimeLifecycle(client));
    await setAppState('background');
    client.stop.mockClear();

    await setNet(false);

    expect(client.stop).not.toHaveBeenCalled();
    expect(client.start).toHaveBeenCalledTimes(1);
  });

  it('starts in idle when mounted in background', async () => {
    setCurrentState('background');

    await renderHook(() => useRealtimeLifecycle(client));

    expect(client.start).not.toHaveBeenCalled();
    expect(client.stop).toHaveBeenCalledWith('idle');
  });

  it('on unmount removes both subscriptions and stops with idle', async () => {
    const { unmount } = await renderHook(() => useRealtimeLifecycle(client));
    client.stop.mockClear();

    await unmount();

    expect(appStateRemove).toHaveBeenCalledTimes(1);
    expect(netUnsubscribe).toHaveBeenCalledTimes(1);
    expect(client.stop).toHaveBeenCalledTimes(1);
    expect(client.stop).toHaveBeenCalledWith('idle');
  });

  it('re-subscribes for a new client and stops the old one', async () => {
    const other = { start: jest.fn(), stop: jest.fn() };
    const { rerender } = await renderHook((props: { c: typeof client }) => useRealtimeLifecycle(props.c), {
      initialProps: { c: client },
    });

    await rerender({ c: other });

    expect(client.stop).toHaveBeenCalledWith('idle');
    expect(other.start).toHaveBeenCalledTimes(1);
    expect(appStateRemove).toHaveBeenCalledTimes(1);
    expect(netUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
