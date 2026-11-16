// The one WebSocket of the app, outside React. Pure TS: no react / react-native imports.
// Desired state (subs) vs. what the server knows (serverStreams); flush() sends the difference.
import { z } from 'zod';

import { CombinedEnvelopeSchema } from '../binance/schemas';
import { DEFAULT_BACKOFF, fullJitterDelay, type BackoffOptions } from './backoff';

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'offline';
export type ConnectionSnapshot = { status: ConnectionStatus; attempt: number; lastMessageAt: number | null };
export type Listener = (data: unknown) => void;
export type StopReason = 'idle' | 'offline';

export type RealtimeClientOptions = {
  url: string; // wss://…/stream — combined: every message arrives as { stream, data }
  createSocket?: (url: string) => WebSocket; // in tests: FakeSocket
  random?: () => number; // for jitter; in tests: () => 0.5
  backoff?: BackoffOptions; // 500 ms → 30 s
  heartbeatMs?: number; // 5 000: how often we check liveness
  probeAfterMs?: number; // 10 000: silence → LIST_SUBSCRIPTIONS as a ping
  staleAfterMs?: number; // 15 000: silence → the connection is dead
  stableAfterMs?: number; // 10 000: open this long → attempt = 0
  sendIntervalMs?: number; // 250: at most 4 control messages per second (Binance limit is 5)
  maxStreams?: number; // 1024: Binance limit per connection
  streamSilentMs?: number; // 30 000: a wanted stream silent this long → reconcile probe (at most one per this period)
  onStatus?: (snapshot: ConnectionSnapshot) => void;
  onError?: (error: Error) => void;
  // A data message reached at least one subscriber (dev metrics: msg/s). `handlerMs` covers JSON.parse,
  // the envelope check and every listener (Zod + conflator write): the 1 ms tick budget, measured once per message.
  onMessage?: (handlerMs: number) => void;
};

// Reply to a control message (SUBSCRIBE, LIST_SUBSCRIPTIONS, ...): has `id`, no `stream`.
// Errors come nested (`error: { code, msg }`) or flat (`code`, `msg`), depending on the endpoint version.
const ControlResponseSchema = z.object({
  id: z.number().nullable(), // Binance answers a malformed request with id null
  result: z.unknown().optional(),
  error: z.object({ code: z.number().optional(), msg: z.string().optional() }).optional(),
  code: z.number().optional(),
  msg: z.string().optional(),
});

const StreamListSchema = z.array(z.string());

// Explicit `undefined` in options must not override a default.
function withoutUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
}

const OPEN = 1; // literal instead of WebSocket.OPEN: Jest may have no global WebSocket
const CLOSE_NORMAL = 1000;
const CLOSE_POLICY_VIOLATION = 1008; // Binance: "Too many requests", "Invalid request" = client bug
const CLOSE_STALE = 4000; // application code: no messages for staleAfterMs
const STATUS_EMIT_INTERVAL_MS = 1_000;
const SERVER_SHUTDOWN_STREAM = '!serverShutdown';

type Timer = ReturnType<typeof setTimeout>;

export class RealtimeClient {
  private readonly opts: Required<Omit<RealtimeClientOptions, 'onStatus' | 'onError' | 'onMessage'>> &
    Pick<RealtimeClientOptions, 'onStatus' | 'onError' | 'onMessage'>;
  private ws: WebSocket | null = null;
  private wanted = false; // true between start() and stop()
  private status: ConnectionStatus = 'idle';
  private attempt = 0;
  private lastMessageAt: number | null = null;
  private lastStatusEmitAt = 0;
  private invalidCount = 0;
  private readonly subs = new Map<string, Set<{ listener: Listener }>>(); // stream → subscribers (desired)
  private readonly serverStreams = new Set<string>(); // what the server knows, as far as we know
  // LIST_SUBSCRIPTIONS probes in flight: id → streams the server had been told about when it was sent
  private readonly probes = new Map<number, Set<string>>();
  // SUBSCRIBE/UNSUBSCRIBE requests in flight: id → streams (to undo a rejected SUBSCRIBE)
  private readonly requests = new Map<number, { method: 'SUBSCRIBE' | 'UNSUBSCRIBE'; streams: string[] }>();
  // Per wanted stream: last time it was sent to the server or delivered data (for per-stream silence)
  private readonly streamLastAt = new Map<string, number>();
  private lastStreamProbeAt = -Infinity;
  private nextId = 1;
  private lastSentAt = -Infinity;
  private reconnectTimer: Timer | null = null;
  private flushTimer: Timer | null = null;
  private stableTimer: Timer | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: RealtimeClientOptions) {
    if (!options.url.startsWith('wss://')) throw new Error('RealtimeClient: url must start with wss://');
    this.opts = {
      createSocket: (url) => new WebSocket(url),
      random: Math.random,
      backoff: DEFAULT_BACKOFF,
      heartbeatMs: 5_000,
      probeAfterMs: 10_000,
      staleAfterMs: 15_000,
      stableAfterMs: 10_000,
      sendIntervalMs: 250,
      maxStreams: 1024,
      streamSilentMs: 30_000,
      ...withoutUndefined(options),
      url: options.url,
    };
  }

  getSnapshot(): ConnectionSnapshot {
    return { status: this.status, attempt: this.attempt, lastMessageAt: this.lastMessageAt };
  }

  /** Messages dropped because they were neither valid JSON nor a valid envelope (dev overlay). */
  getInvalidMessageCount(): number {
    return this.invalidCount;
  }

  start(): void {
    if (this.wanted) return;
    this.wanted = true;
    this.connect();
  }

  stop(reason: StopReason = 'idle'): void {
    this.wanted = false;
    this.clearReconnectTimer();
    const ws = this.ws;
    this.dropSocket(); // before close(): a late onclose of this socket must hit the guard
    this.closeSocket(ws, CLOSE_NORMAL);
    this.attempt = 0;
    this.setStatus(reason);
  }

  subscribe(stream: string, listener: Listener): () => void {
    // Only the symbol part must be lowercase: stream types are camelCase (btcusdt@miniTicker).
    const symbol = stream.split('@')[0] ?? '';
    if (!stream.startsWith('!') && symbol !== symbol.toLowerCase()) {
      throw new Error(`Stream symbol must be lowercase: ${stream}`);
    }
    let entries = this.subs.get(stream);
    if (!entries && this.subs.size >= this.opts.maxStreams) {
      throw new Error(`Too many streams: max ${this.opts.maxStreams} per connection`);
    }
    const entry = { listener }; // a new object per subscription: the same function may subscribe twice
    if (entries) {
      entries.add(entry);
    } else {
      entries = new Set([entry]);
      this.subs.set(stream, entries);
      this.scheduleFlush();
    }
    return () => {
      const current = this.subs.get(stream);
      if (!current || !current.delete(entry)) return; // second call: no effect
      if (current.size === 0) {
        this.subs.delete(stream);
        this.scheduleFlush();
      }
    };
  }

  private connect(): void {
    this.setStatus(this.attempt > 0 ? 'reconnecting' : 'connecting');
    if (!this.wanted) return; // onStatus may have called stop() synchronously
    this.serverStreams.clear();
    let ws: WebSocket;
    try {
      ws = this.opts.createSocket(this.opts.url);
    } catch (e) {
      this.report(e);
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (ws !== this.ws) return;
      this.lastMessageAt = Date.now();
      this.setStatus('open');
      this.heartbeatTimer = setInterval(() => this.checkHeartbeat(), this.opts.heartbeatMs);
      // attempt resets only after a stable connection: a server that accepts and drops at once keeps the backoff growing
      this.stableTimer = setTimeout(() => {
        this.stableTimer = null;
        if (this.attempt === 0) return;
        this.attempt = 0;
        this.emitStatus();
      }, this.opts.stableAfterMs);
      this.scheduleFlush();
    };
    ws.onmessage = (event) => {
      if (ws !== this.ws) return;
      this.lastMessageAt = Date.now();
      this.handleMessage(event.data);
      if (ws === this.ws && Date.now() - this.lastStatusEmitAt >= STATUS_EMIT_INTERVAL_MS) this.emitStatus();
    };
    ws.onerror = () => {
      // intentionally empty: an error is always followed by close, which drives the reconnect
    };
    ws.onclose = (event) => {
      if (ws !== this.ws) return;
      this.dropSocket();
      if (event.code === CLOSE_POLICY_VIOLATION) {
        this.report(new Error(`Socket closed with 1008 (client bug): ${event.reason}`));
      }
      if (this.wanted) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = fullJitterDelay(this.attempt, this.opts.backoff, this.opts.random);
    this.attempt += 1;
    this.status = 'reconnecting';
    // Arm the timer first: a throwing consumer must not be able to stop the reconnect.
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.wanted) this.connect();
    }, delay);
    this.emitStatus(); // always: `attempt` changed even when the status did not
  }

  private reconnectNow(): void {
    this.clearReconnectTimer();
    const ws = this.ws;
    this.dropSocket();
    this.closeSocket(ws, CLOSE_NORMAL);
    if (this.wanted) this.connect();
  }

  private handleMessage(raw: unknown): void {
    const startedAt = performance.now();
    let parsed: unknown;
    try {
      if (typeof raw !== 'string') throw new Error('Not JSON');
      parsed = JSON.parse(raw);
    } catch {
      this.invalidCount += 1;
      this.report(new Error('Not JSON'));
      return;
    }

    // Cheap discrimination: a data tick must not pay for two Zod parses.
    const isEnvelope = typeof parsed === 'object' && parsed !== null && 'stream' in parsed;
    if (!isEnvelope) {
      const response = ControlResponseSchema.safeParse(parsed);
      if (response.success) this.handleControlResponse(response.data);
      else this.dropInvalid();
      return;
    }

    const envelope = CombinedEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      this.dropInvalid();
      return;
    }

    const { stream, data } = envelope.data;
    if (stream === SERVER_SHUTDOWN_STREAM) {
      this.reconnectNow();
      return;
    }
    const entries = this.subs.get(stream);
    if (!entries) return;
    this.streamLastAt.set(stream, Date.now());
    for (const entry of [...entries]) {
      try {
        entry.listener(data);
      } catch (e) {
        this.report(e); // one broken listener must not break the others
      }
    }
    this.opts.onMessage?.(performance.now() - startedAt);
  }

  private dropInvalid(): void {
    this.invalidCount += 1;
    this.report(new Error('Invalid message: not a { stream, data } envelope'));
  }

  private handleControlResponse(response: z.infer<typeof ControlResponseSchema>): void {
    const id = response.id;
    const sentStreams = id === null ? undefined : this.probes.get(id);
    const request = id === null ? undefined : this.requests.get(id);
    if (id !== null) {
      this.probes.delete(id);
      this.requests.delete(id);
    }
    const error = response.error ?? (response.code !== undefined ? response : undefined);
    if (error) {
      if (request?.method === 'SUBSCRIBE') {
        // Rejected: the server does not have these streams. No immediate re-flush (a permanently invalid
        // name would loop); the next reconcile probe re-sends them, so retries are at most one per streamSilentMs.
        for (const s of request.streams) this.serverStreams.delete(s);
      }
      this.report(new Error(`Binance error ${error.code ?? '?'}: ${error.msg ?? 'unknown'}`));
      return;
    }
    if (!sentStreams) return; // reply to SUBSCRIBE/UNSUBSCRIBE, or an id we do not know

    // Reconcile: a stream we believe is subscribed but the server does not list → forget it so flush() re-sends it.
    const list = StreamListSchema.safeParse(response.result);
    if (!list.success) {
      this.invalidCount += 1;
      this.report(new Error('Invalid LIST_SUBSCRIPTIONS result'));
      return;
    }
    const live = new Set(list.data.map((s) => s.toLowerCase()));
    let lost = false;
    for (const stream of sentStreams) {
      // `sentStreams` is the snapshot at probe time: streams subscribed after the probe are not judged by this reply
      if (this.subs.has(stream) && this.serverStreams.has(stream) && !live.has(stream.toLowerCase())) {
        this.serverStreams.delete(stream);
        lost = true;
      }
    }
    if (lost || this.hasPendingDifference()) this.scheduleFlush();
  }

  private checkHeartbeat(): void {
    if (!this.ws) return;
    const silence = Date.now() - (this.lastMessageAt ?? 0);
    if (silence >= this.opts.staleAfterMs) {
      // Half-open TCP: onclose may never come, so do not wait for it.
      const ws = this.ws;
      this.dropSocket();
      this.closeSocket(ws, CLOSE_STALE, 'stale');
      if (this.wanted) this.scheduleReconnect();
      return;
    }
    if (silence >= this.opts.probeAfterMs) {
      this.sendProbe();
      return;
    }
    // Data flows overall, but one wanted stream may have lost its server-side subscription: reconcile.
    const now = Date.now();
    if (now - this.lastStreamProbeAt >= this.opts.streamSilentMs && this.hasSilentStream(now) && this.sendProbe()) {
      this.lastStreamProbeAt = now;
    }
  }

  private hasSilentStream(now: number): boolean {
    for (const stream of this.subs.keys()) {
      const at = this.streamLastAt.get(stream);
      if (at !== undefined && now - at >= this.opts.streamSilentMs) return true;
    }
    return false;
  }

  private sendProbe(): boolean {
    const id = this.nextId;
    const known = new Set(this.serverStreams);
    if (!this.sendControl('LIST_SUBSCRIPTIONS')) return false;
    this.probes.set(id, known);
    return true;
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null || !this.isOpen()) return;
    const delay = Math.max(0, this.lastSentAt + this.opts.sendIntervalMs - Date.now());
    this.flushTimer = setTimeout(() => this.flush(), delay);
  }

  private flush(): void {
    this.flushTimer = null;
    if (!this.isOpen()) return;
    if (Date.now() - this.lastSentAt < this.opts.sendIntervalMs) {
      this.scheduleFlush(); // another control message (a probe) went out meanwhile
      return;
    }
    // The difference is computed at send time: everything that changed while waiting is batched.
    const toSubscribe = [...this.subs.keys()].filter((s) => !this.serverStreams.has(s));
    const id = this.nextId;
    if (toSubscribe.length > 0) {
      if (this.sendControl('SUBSCRIBE', toSubscribe)) {
        const now = Date.now();
        for (const s of toSubscribe) {
          this.serverStreams.add(s);
          this.streamLastAt.set(s, now);
        }
        this.requests.set(id, { method: 'SUBSCRIBE', streams: toSubscribe });
      }
    } else {
      const toUnsubscribe = [...this.serverStreams].filter((s) => !this.subs.has(s));
      if (toUnsubscribe.length > 0 && this.sendControl('UNSUBSCRIBE', toUnsubscribe)) {
        for (const s of toUnsubscribe) {
          this.serverStreams.delete(s);
          this.streamLastAt.delete(s);
        }
        this.requests.set(id, { method: 'UNSUBSCRIBE', streams: toUnsubscribe });
      }
    }
    // Also after a failed send (the gate in sendControl spaces the retries): the difference is retried.
    if (this.hasPendingDifference()) this.scheduleFlush();
  }

  private hasPendingDifference(): boolean {
    for (const s of this.subs.keys()) if (!this.serverStreams.has(s)) return true;
    for (const s of this.serverStreams) if (!this.subs.has(s)) return true;
    return false;
  }

  private sendControl(method: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'LIST_SUBSCRIPTIONS', params?: string[]): boolean {
    const ws = this.ws;
    const now = Date.now();
    if (!ws || !this.isOpen() || now - this.lastSentAt < this.opts.sendIntervalMs) return false;
    const id = this.nextId;
    try {
      ws.send(JSON.stringify(params ? { method, params, id } : { method, id }));
    } catch (e) {
      this.report(e); // the socket is probably going down; flush() retries after the send interval
      this.lastSentAt = now; // a failed attempt counts for the gate: no tight retry loop
      return false;
    }
    this.nextId += 1;
    this.lastSentAt = now;
    return true;
  }

  private dropSocket(): void {
    this.ws = null;
    this.serverStreams.clear();
    this.probes.clear();
    this.requests.clear();
    this.streamLastAt.clear();
    this.lastStreamProbeAt = -Infinity;
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    if (this.stableTimer !== null) clearTimeout(this.stableTimer);
    if (this.heartbeatTimer !== null) clearInterval(this.heartbeatTimer);
    this.flushTimer = null;
    this.stableTimer = null;
    this.heartbeatTimer = null;
  }

  private closeSocket(ws: WebSocket | null, code: number, reason?: string): void {
    try {
      ws?.close(code, reason);
    } catch (e) {
      this.report(e); // the socket is already forgotten; a throwing close must not stop the recovery
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === OPEN;
  }

  private setStatus(status: ConnectionStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.emitStatus();
  }

  private emitStatus(): void {
    this.lastStatusEmitAt = Date.now();
    try {
      this.opts.onStatus?.(this.getSnapshot());
    } catch (e) {
      this.report(e); // a throwing consumer must not break reconnect or heartbeat
    }
  }

  private report(e: unknown): void {
    try {
      this.opts.onError?.(e instanceof Error ? e : new Error(String(e)));
    } catch {
      // a throwing error handler has nowhere left to report to
    }
  }
}
