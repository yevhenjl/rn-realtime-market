import type { ConnectionSnapshot } from '@/realtime/RealtimeClient';

/** Single source of truth: the snapshot the realtime client publishes. */
export type BannerInput = ConnectionSnapshot;

export type BannerState = {
  kind: 'connecting' | 'reconnecting' | 'offline' | 'stale';
  text: string;
};

// An open socket with no message for 30 s is "stale".
export const STALE_AFTER_MS = 30_000;

/**
 * Pure banner logic. Stale means strictly more than STALE_AFTER_MS since the
 * last message (exactly at the threshold is still fresh). An open connection
 * with no message yet (`lastMessageAt === null`) shows no banner: there is no
 * age to measure, and a silent socket is caught by the client heartbeat.
 */
export function getBannerState(input: BannerInput, now: number): BannerState | null {
  switch (input.status) {
    case 'idle':
      return null;
    case 'connecting':
      return { kind: 'connecting', text: 'Connecting' };
    case 'reconnecting':
      return { kind: 'reconnecting', text: `Reconnecting (attempt ${input.attempt})` };
    case 'offline':
      return { kind: 'offline', text: 'No internet' };
    case 'open':
      if (input.lastMessageAt !== null && now - input.lastMessageAt > STALE_AFTER_MS) {
        return { kind: 'stale', text: 'Data is stale' };
      }
      return null;
  }
}
