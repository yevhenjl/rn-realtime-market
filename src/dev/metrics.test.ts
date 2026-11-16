import { bestClockOffset, estimateClockOffset, increment, metrics, percentile, recordHandlerMs, recordLatency } from './metrics';

beforeEach(() => {
  metrics.latency.length = 0;
  metrics.handlerMs.length = 0;
  metrics.clockOffsetMs = 0;
});

describe('percentile (nearest-rank)', () => {
  const oneToHundred = Array.from({ length: 100 }, (_, i) => i + 1);

  it('p50 and p95 of 1..100', () => {
    expect(percentile(oneToHundred, 50)).toBe(50);
    expect(percentile(oneToHundred, 95)).toBe(95);
  });

  it('does not depend on input order and does not mutate it', () => {
    const shuffled = [...oneToHundred].reverse();
    expect(percentile(shuffled, 95)).toBe(95);
    expect(shuffled[0]).toBe(100);
  });

  it('empty array gives null', () => {
    expect(percentile([], 50)).toBeNull();
  });

  it('p0 and p100 stay inside the array', () => {
    expect(percentile([7, 3, 9], 0)).toBe(3);
    expect(percentile([7, 3, 9], 100)).toBe(9);
  });
});

describe('estimateClockOffset', () => {
  it('serverTime minus the midpoint of the request', () => {
    expect(estimateClockOffset(1000, 1350, 1100)).toBe(300);
  });
});

describe('recordLatency', () => {
  it('latency = receivedAt + clockOffset - eventTime', () => {
    metrics.clockOffsetMs = 300;
    recordLatency(1000, 1200);
    expect(metrics.latency).toEqual([500]);
  });

  it('keeps only the last 200 samples', () => {
    for (let i = 0; i < 205; i++) recordLatency(0, i);
    expect(metrics.latency).toHaveLength(200);
    expect(metrics.latency[0]).toBe(5);
    expect(metrics.latency.at(-1)).toBe(204);
  });
});

describe('recordHandlerMs', () => {
  it('stores the handler time as is', () => {
    recordHandlerMs(0.25);
    expect(metrics.handlerMs).toEqual([0.25]);
  });

  it('keeps only the last 200 samples', () => {
    for (let i = 0; i < 205; i++) recordHandlerMs(i);
    expect(metrics.handlerMs).toHaveLength(200);
    expect(metrics.handlerMs[0]).toBe(5);
    expect(metrics.handlerMs.at(-1)).toBe(204);
  });
});

describe('increment', () => {
  it('adds one to the named counter only', () => {
    metrics.flushes = 4;
    metrics.gaps = 0;
    increment('flushes');
    expect(metrics.flushes).toBe(5);
    expect(metrics.gaps).toBe(0);
  });
});

describe('bestClockOffset', () => {
  it('null without samples', () => {
    expect(bestClockOffset([])).toBeNull();
  });

  it('uses the sample with the shortest round trip', () => {
    expect(
      bestClockOffset([
        { sentAt: 0, serverTime: 900, receivedAt: 1_200 }, // RTT 1200 -> 300
        { sentAt: 2_000, serverTime: 1_600, receivedAt: 2_100 }, // RTT 100 -> -450
        { sentAt: 3_000, serverTime: 2_700, receivedAt: 3_300 }, // RTT 300 -> -450
      ]),
    ).toBe(-450);
  });
});
