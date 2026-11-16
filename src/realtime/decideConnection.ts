export type ConnectionDecision = 'run' | 'idle' | 'offline';

/**
 * Decision table for the single socket: background -> idle (regardless of network),
 * otherwise no network -> offline, otherwise run.
 * Any non-background appState ('active', 'inactive', 'unknown', 'extension', null, undefined)
 * counts as foreground: 'inactive' (iOS shade, incoming call) and a not-yet-known state
 * must not kill the socket. `isConnected === null` (NetInfo has not answered) counts as online.
 */
export function decideConnection(appState: string | null | undefined, isConnected: boolean | null): ConnectionDecision {
  if (appState === 'background') return 'idle';
  if (isConnected === false) return 'offline';
  return 'run';
}
