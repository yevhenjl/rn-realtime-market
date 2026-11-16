import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { queryClient, setupQueryManagers } from './queryClient';

const addNetInfo = jest.mocked(NetInfo.addEventListener);

function netState(isConnected: boolean) {
  return { isConnected } as NetInfoState;
}

describe('setupQueryManagers', () => {
  let netListener: ((state: NetInfoState) => void) | undefined;
  let appListener: ((status: AppStateStatus) => void) | undefined;
  let unsubscribeNet: jest.Mock;
  let removeApp: jest.Mock;
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    unsubscribeNet = jest.fn();
    removeApp = jest.fn();
    addNetInfo.mockImplementation((listener) => {
      netListener = listener;
      return unsubscribeNet;
    });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appListener = listener;
      return { remove: removeApp };
    });
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    onlineManager.setOnline(true);
    focusManager.setFocused(undefined);
    jest.restoreAllMocks();
  });

  it('exports a QueryClient and does not subscribe at import time', () => {
    expect(queryClient.getQueryCache()).toBeDefined();
    expect(addNetInfo).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it('maps NetInfo connectivity to onlineManager', () => {
    cleanup = setupQueryManagers();
    expect(addNetInfo).toHaveBeenCalledTimes(1);

    netListener?.(netState(false));
    expect(onlineManager.isOnline()).toBe(false);

    netListener?.(netState(true));
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('maps AppState to focusManager', () => {
    cleanup = setupQueryManagers();
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    appListener?.('background');
    expect(focusManager.isFocused()).toBe(false);

    appListener?.('active');
    expect(focusManager.isFocused()).toBe(true);

    appListener?.('inactive');
    expect(focusManager.isFocused()).toBe(false);
  });

  it('cleanup unsubscribes from NetInfo and AppState', () => {
    cleanup = setupQueryManagers();
    expect(unsubscribeNet).not.toHaveBeenCalled();
    expect(removeApp).not.toHaveBeenCalled();

    cleanup();
    cleanup = undefined;

    expect(unsubscribeNet).toHaveBeenCalledTimes(1);
    expect(removeApp).toHaveBeenCalledTimes(1);
  });
});
