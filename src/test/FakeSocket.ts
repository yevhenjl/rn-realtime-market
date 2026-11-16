export class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0; // CONNECTING
  sent: unknown[] = []; // что клиент отправил (уже JSON.parse)
  closedWith: { code?: number; reason?: string } | null = null;
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }

  static last(): FakeSocket {
    const s = FakeSocket.instances.at(-1);
    if (!s) throw new Error('no socket was created');
    return s;
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close(code?: number, reason?: string) {
    this.closedWith = { code, reason };
    this.readyState = 2; // CLOSING; onclose придёт, только если тест вызовет serverClose()
  }

  // --- управление из теста ---
  serverOpen() {
    this.readyState = 1;
    this.onopen?.({});
  }

  serverSend(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  serverSendRaw(data: string) {
    this.onmessage?.({ data });
  }

  serverClose(code = 1006, reason = '') {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}
