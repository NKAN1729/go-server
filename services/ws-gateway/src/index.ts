import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { Redis } from "ioredis";
import type { RedisGameEvent, WsClientMessage, WsServerMessage } from "@go-server/shared-types";

const PORT = Number(process.env["PORT"] ?? 3002);
const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";
const PING_INTERVAL_MS = 30_000;

interface ClientSession {
  ws: WebSocket;
  gameId: string | null;
  playerId: string | null;
  isAlive: boolean;
}

const gameSubscriptions = new Map<string, Set<ClientSession>>();
const sessions = new Set<ClientSession>();
const subscriber = new Redis(REDIS_URL, { lazyConnect: true });

subscriber.on("message", (channel: string, message: string) => {
  let event: RedisGameEvent;
  try { event = JSON.parse(message) as RedisGameEvent; }
  catch { console.error("[ws-gateway] Failed to parse Redis message on", channel); return; }

  if (event.version !== 1) { console.warn("[ws-gateway] Unknown version:", event.version); return; }

  const watchers = gameSubscriptions.get(event.gameId);
  if (!watchers || watchers.size === 0) return;

  let outbound: WsServerMessage;
  switch (event.type) {
    case "move_made":    outbound = { version: 1, type: "game_state",    payload: event.state }; break;
    case "player_joined": outbound = { version: 1, type: "player_joined", payload: { color: event.color } }; break;
    case "game_ended":   return;
    default:             return;
  }

  const payload = JSON.stringify(outbound);
  for (const session of watchers) {
    if (session.ws.readyState === WebSocket.OPEN) session.ws.send(payload);
  }
});

const server = createServer();
const wss = new WebSocketServer({ server });

function send(ws: WebSocket, msg: WsServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function cleanup(session: ClientSession): void {
  sessions.delete(session);
  if (session.gameId) {
    const watchers = gameSubscriptions.get(session.gameId);
    watchers?.delete(session);
    if (watchers?.size === 0) {
      gameSubscriptions.delete(session.gameId);
      subscriber.unsubscribe(`game:${session.gameId}`).catch(console.error);
    }
  }
}

wss.on("connection", (ws: WebSocket) => {
  const session: ClientSession = { ws, gameId: null, playerId: null, isAlive: true };
  sessions.add(session);

  ws.on("pong", () => { session.isAlive = true; });

  ws.on("message", (data: Buffer) => {
    let msg: WsClientMessage;
    try { msg = JSON.parse(data.toString()) as WsClientMessage; }
    catch { return; }
    if (msg.version !== 1) return;

    if (msg.type === "subscribe") {
      const { gameId, playerId } = msg.payload;
      if (session.gameId) gameSubscriptions.get(session.gameId)?.delete(session);
      session.gameId = gameId;
      session.playerId = playerId;
      if (!gameSubscriptions.has(gameId)) {
        gameSubscriptions.set(gameId, new Set());
        subscriber.subscribe(`game:${gameId}`).catch(console.error);
      }
      gameSubscriptions.get(gameId)!.add(session);
    }
  });

  ws.on("close", () => cleanup(session));
  ws.on("error", (err) => { console.error("[ws-gateway] error:", err.message); cleanup(session); });
});

const heartbeat = setInterval(() => {
  for (const session of sessions) {
    if (!session.isAlive) { session.ws.terminate(); cleanup(session); continue; }
    session.isAlive = false;
    send(session.ws, { version: 1, type: "ping" });
  }
}, PING_INTERVAL_MS);

async function main(): Promise<void> {
  await subscriber.connect();
  console.log("[ws-gateway] Redis connected");
  server.listen(PORT, "0.0.0.0", () => console.log(`[ws-gateway] Listening on port ${PORT}`));
}

main().catch((err) => { console.error(err); process.exit(1); });

process.on("SIGTERM", () => {
  clearInterval(heartbeat);
  wss.close(() => { subscriber.quit().catch(console.error); server.close(() => process.exit(0)); });
});
