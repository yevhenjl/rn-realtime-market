import { useShallow } from 'zustand/react/shallow';

import { useConnection } from '@/store/connectionStore';

import { ConnectionBanner } from './ConnectionBanner';

/** Binds the banner to the connection store, so the root layout itself never re-renders on ticks. */
export function LiveConnectionBanner() {
  const connection = useConnection(
    useShallow((s) => ({
      status: s.status,
      attempt: s.attempt,
      lastMessageAt: s.lastMessageAt,
    })),
  );
  return <ConnectionBanner connection={connection} />;
}
