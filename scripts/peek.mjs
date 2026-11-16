// Prints the first messages from the Binance combined stream endpoint.
// Usage: node scripts/peek.mjs btcusdt@miniTicker btcusdt@kline_1m
// Sends no control messages (Binance allows at most 5 per second).
const streams = process.argv.slice(2);
if (streams.length === 0) {
  console.error('usage: node scripts/peek.mjs <stream> [<stream> ...]');
  process.exit(1);
}

const ws = new WebSocket(`wss://data-stream.binance.vision/stream?streams=${streams.join('/')}`);
let n = 0;
// Safety net: do not hang forever if the streams stay silent.
const timer = setTimeout(() => ws.close(1000), 30_000);
ws.onopen = () => console.log('open');
ws.onmessage = (e) => {
  console.log(String(e.data).slice(0, 200));
  if (++n >= 10) ws.close(1000);
};
ws.onerror = () => console.error('error');
ws.onclose = (e) => {
  clearTimeout(timer);
  console.log('close', e.code, e.reason);
};
