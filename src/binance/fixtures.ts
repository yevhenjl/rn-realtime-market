// Real Binance messages captured on 2026-11-12, BTCUSDT, unmodified.
// Streams: wss://data-stream.binance.vision/stream?streams=btcusdt@miniTicker/btcusdt@trade/btcusdt@kline_1m
//   (the `data` payload of each combined-stream envelope)
// REST row: https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=1
// Not validated here: these are inputs for schema tests.

export const miniTicker = {
  e: '24hrMiniTicker',
  E: 1794471709017,
  s: 'BTCUSDT',
  c: '73607.75000000',
  o: '73960.44000000',
  h: '74811.45000000',
  l: '73390.13000000',
  v: '12718.31229000',
  q: '941620555.65748450',
};

// `M` is an ignored field that Binance still sends; the schema must strip it.
export const trade = {
  e: 'trade',
  E: 1794471708443,
  s: 'BTCUSDT',
  t: 6842169712,
  p: '73607.75000000',
  q: '0.00013000',
  T: 1794471708443,
  m: false,
  M: true,
};

export const kline = {
  e: 'kline',
  E: 1794471710036,
  s: 'BTCUSDT',
  k: {
    t: 1794471660000,
    T: 1794471719999,
    s: 'BTCUSDT',
    i: '1m',
    f: 6842169417,
    L: 6842169715,
    o: '73607.15000000',
    c: '73607.75000000',
    h: '73607.79000000',
    l: '73607.15000000',
    v: '0.61042000',
    n: 299,
    x: false,
    q: '44931.59579460',
    V: '0.30150000',
    Q: '22192.69645100',
    B: '0',
  },
};

export const klineRow = [
  1794471720000,
  '73592.54000000',
  '73592.54000000',
  '73569.99000000',
  '73569.99000000',
  '0.90585000',
  1794471779999,
  '66651.87631230',
  482,
  '0.10807000',
  '7953.14309420',
  '0',
];
