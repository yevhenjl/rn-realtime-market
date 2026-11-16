import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { decideConnection, type ConnectionDecision } from './decideConnection';
import type { RealtimeClient } from './RealtimeClient';

/** AppState + NetInfo drive the single socket: start when foreground and online, stop otherwise. */
export function useRealtimeLifecycle(client: Pick<RealtimeClient, 'start' | 'stop'>): void {
  useEffect(() => {
    // Subscription state, not render data: plain locals instead of useState.
    let appState: string | null | undefined = AppState.currentState;
    let isConnected: boolean | null = null;
    let last: ConnectionDecision | null = null;

    const apply = () => {
      const decision = decideConnection(appState, isConnected);
      if (decision === last) return; // stop() re-emits status and resets attempt: call only on change
      last = decision;
      if (decision === 'run') client.start();
      else client.stop(decision);
    };

    apply();
    const appStateSub = AppState.addEventListener('change', (next) => {
      appState = next;
      apply();
    });
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      isConnected = state.isConnected;
      apply();
    });

    return () => {
      appStateSub.remove();
      unsubscribeNet();
      client.stop('idle');
    };
  }, [client]);
}
