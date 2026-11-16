import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { shouldRetry } from '@/binance/rest';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry },
  },
});

/**
 * Connects TanStack Query's online/focus state to React Native (NetInfo, AppState).
 * Explicit call instead of an import side effect, so Jest imports stay inert.
 * Call once at app start (root layout) and return the cleanup from the effect.
 */
export function setupQueryManagers(): () => void {
  let removeNetInfo: (() => void) | undefined;
  let removeAppState: (() => void) | undefined;

  onlineManager.setEventListener((setOnline) => {
    removeNetInfo = NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    });
    return removeNetInfo;
  });

  if (Platform.OS !== 'web') {
    focusManager.setEventListener((setFocused) => {
      const subscription = AppState.addEventListener('change', (status) => {
        setFocused(status === 'active');
      });
      removeAppState = () => subscription.remove();
      return removeAppState;
    });
  }

  return () => {
    removeNetInfo?.();
    removeAppState?.();
  };
}
