/**
 * wsClient.ts
 * Plain-class WebSocket wrapper. No React. No game logic.
 * Reconnects automatically. Typed message bus.
 */

export type WsIncoming =
  | { type: "game_state"; payload: import("./api").GameStateDTO }
  | { type: "error";      payload: { message: string } }
  | { type: "ping" };

type MessageHandler = (msg: WsIncoming) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private url: string;
  private reconnectDelay = 1500;
  private intentionalClose = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.intentionalClose = false;
    this._open();
  }

  private _open(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsIncoming;
        this.handlers.forEach((h) => h(msg));
      } catch {
        /* ignore malformed frames */
      }
    };

    this.ws.onclose = () => {
      if (!this.intentionalClose) {
        setTimeout(() => this._open(), this.reconnectDelay);
      }
    };

    this.ws.onerror = () => this.ws?.close();
  }

  send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.ws?.close();
  }
}
