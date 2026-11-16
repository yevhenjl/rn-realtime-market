import { STALE_AFTER_MS, getBannerState, type BannerInput } from './getBannerState';

const NOW = 1_000_000;
const input = (patch: Partial<BannerInput>): BannerInput => ({
  status: 'open',
  attempt: 0,
  lastMessageAt: NOW,
  ...patch,
});

describe('getBannerState', () => {
  it('idle shows no banner', () => {
    expect(getBannerState(input({ status: 'idle', lastMessageAt: null }), NOW)).toBeNull();
  });

  it('connecting', () => {
    expect(getBannerState(input({ status: 'connecting', lastMessageAt: null }), NOW)).toEqual({
      kind: 'connecting',
      text: 'Connecting',
    });
  });

  it('reconnecting includes the attempt number', () => {
    expect(getBannerState(input({ status: 'reconnecting', attempt: 3 }), NOW)).toEqual({
      kind: 'reconnecting',
      text: 'Reconnecting (attempt 3)',
    });
    expect(getBannerState(input({ status: 'reconnecting', attempt: 12 }), NOW)?.text).toBe(
      'Reconnecting (attempt 12)',
    );
  });

  it('offline', () => {
    expect(getBannerState(input({ status: 'offline' }), NOW)).toEqual({
      kind: 'offline',
      text: 'No internet',
    });
  });

  it('open with fresh data shows no banner', () => {
    expect(getBannerState(input({ lastMessageAt: NOW - 1000 }), NOW)).toBeNull();
  });

  it('stale threshold is 30 s', () => {
    expect(STALE_AFTER_MS).toBe(30_000);
  });

  it('stale boundary: below and exactly at threshold is fresh, above is stale', () => {
    expect(getBannerState(input({ lastMessageAt: NOW - (STALE_AFTER_MS - 1) }), NOW)).toBeNull();
    expect(getBannerState(input({ lastMessageAt: NOW - STALE_AFTER_MS }), NOW)).toBeNull();
    expect(getBannerState(input({ lastMessageAt: NOW - (STALE_AFTER_MS + 1) }), NOW)).toEqual({
      kind: 'stale',
      text: 'Data is stale',
    });
  });

  it('open with no message yet shows no banner', () => {
    expect(getBannerState(input({ lastMessageAt: null }), NOW)).toBeNull();
  });

  it('stale applies only to an open connection', () => {
    const old = NOW - 10 * STALE_AFTER_MS;
    expect(getBannerState(input({ status: 'offline', lastMessageAt: old }), NOW)?.kind).toBe('offline');
    expect(getBannerState(input({ status: 'idle', lastMessageAt: old }), NOW)).toBeNull();
  });
});
