// Connection snapshot written by the realtime client (src/realtime/client.ts), read by the banner.
import { create } from 'zustand';

import type { ConnectionSnapshot } from '@/realtime/RealtimeClient';

export const useConnection = create<ConnectionSnapshot>()(() => ({
  status: 'idle',
  attempt: 0,
  lastMessageAt: null,
}));
