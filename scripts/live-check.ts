// Live check against real Binance (Node, no app). Run: bunx tsx scripts/live-check.ts
// Never part of CI or Jest. Expect: connecting → open → ticks 2…5 → idle, no errors.
import { WS_URL } from '../src/config';
import { RealtimeClient } from '../src/realtime/RealtimeClient';

const client = new RealtimeClient({
  url: WS_URL,
  onStatus: (s) => console.log('status', s.status, 'attempt', s.attempt),
  onError: (e) => console.log('error', e.message),
});
let ticks = 0;
const off = client.subscribe('btcusdt@miniTicker', () => {
  ticks += 1;
});
client.start();
setTimeout(off, 6_000); // unsubscribe: ticks stop growing
setTimeout(() => {
  console.log('ticks', ticks);
  client.stop();
}, 9_000);
