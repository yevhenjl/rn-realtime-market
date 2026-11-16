import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PerformanceMonitor } from 'react-native-reanimated';

import { realtime } from '@/realtime/client';

import { isDevToolsEnabled } from './gate';
import { metrics, percentile } from './metrics';


const REFRESH_MS = 1_000;

type Stats = {
  messagesPerSec: number | null; // null until the first full second has passed
  invalid: number;
  reconnects: number;
  gaps: number;
  p50: number | null;
  p95: number | null;
  tickP50: number | null;
  tickP95: number | null;
  flushesPerSec: number | null;
};

function readStats(messagesPerSec: number | null, flushesPerSec: number | null = null): Stats {
  return {
    messagesPerSec,
    flushesPerSec,
    // Client-level drops (bad JSON or envelope) live in RealtimeClient; handler-level drops (Zod) in metrics.
    invalid: metrics.invalid + realtime.getInvalidMessageCount(),
    reconnects: metrics.reconnects,
    gaps: metrics.gaps,
    p50: percentile(metrics.latency, 50),
    p95: percentile(metrics.latency, 95),
    tickP50: percentile(metrics.handlerMs, 50),
    tickP95: percentile(metrics.handlerMs, 95),
  };
}

const formatMs = (ms: number | null) => (ms === null ? '-' : `${Math.round(ms)} ms`);
// Tick handling is sub-millisecond (budget 1 ms): two decimals, not whole milliseconds.
const formatTickMs = (ms: number | null) => (ms === null ? '-' : `${ms.toFixed(2)} ms`);
const formatRate = (perSec: number | null) => (perSec === null ? '-' : perSec.toFixed(1));

/**
 * Dev-only metrics panel. A sibling of the navigator: it owns its state, so market ticks never re-render it
 * (it polls `metrics` once a second) and it never re-renders the watchlist. The poll runs only while open.
 */
export function DevOverlay() {
  if (!isDevToolsEnabled()) return null; // see ./gate
  return <Overlay />;
}

function Overlay() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats>(() => readStats(null));

  useEffect(() => {
    if (!open) return;
    let lastMessages = metrics.messages;
    let lastFlushes = metrics.flushes;
    let lastAt = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(1, now - lastAt);
      const perSec = ((metrics.messages - lastMessages) * 1_000) / elapsed;
      const flushesPerSec = ((metrics.flushes - lastFlushes) * 1_000) / elapsed;
      lastMessages = metrics.messages;
      lastFlushes = metrics.flushes;
      lastAt = now;
      setStats(readStats(perSec, flushesPerSec));
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [open]);

  const toggle = () => {
    if (!open) setStats(readStats(null)); // fresh numbers at once, not after the first tick
    setOpen(!open);
  };

  // Top-right, just below the stack header (status bar inset + ~56 px), so it never covers the theme toggle.
  return (
    <View pointerEvents="box-none" className="absolute top-safe-offset-16 right-safe-offset-2 items-end gap-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide dev metrics' : 'Show dev metrics'}
        testID="dev-overlay-toggle"
        hitSlop={8}
        onPress={toggle}
        className="rounded-full border border-border bg-surface px-2 py-0.5 active:opacity-70">
        <Text className="text-[11px] text-muted">dev</Text>
      </Pressable>
      {open ? (
        <View testID="dev-overlay-panel" className="min-w-40 rounded-lg border border-border bg-surface p-2">
          <Text className="text-[11px] tabular-nums text-fg">
            msg/s {formatRate(stats.messagesPerSec)}
          </Text>
          <Text className="text-[11px] tabular-nums text-fg">flush/s {formatRate(stats.flushesPerSec)}</Text>
          <Text className="text-[11px] tabular-nums text-fg">
            tick p50 {formatTickMs(stats.tickP50)} / p95 {formatTickMs(stats.tickP95)}
          </Text>
          <Text className="text-[11px] tabular-nums text-fg">invalid {stats.invalid}</Text>
          <Text className="text-[11px] tabular-nums text-fg">reconnects {stats.reconnects}</Text>
          <Text className="text-[11px] tabular-nums text-fg">gaps {stats.gaps}</Text>
          <Text className="text-[11px] tabular-nums text-fg">
            latency p50 {formatMs(stats.p50)} / p95 {formatMs(stats.p95)}
          </Text>
          <View className="mt-1 h-5">
            <PerformanceMonitor />
          </View>
        </View>
      ) : null}
    </View>
  );
}
