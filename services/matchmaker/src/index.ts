import Fastify from "fastify";
import cors from "@fastify/cors";
import { Redis } from "ioredis";
import { z } from "zod";
import type { BoardSize, MatchFoundEvent } from "@go-server/shared-types";

const PORT = Number(process.env["PORT"] ?? 3003);
const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";
const GAME_SERVER_URL = process.env["GAME_SERVER_URL"] ?? "http://localhost:3001";

const redis = new Redis(REDIS_URL, { lazyConnect: true });

function lobbyKey(boardSize: BoardSize, timeControlSeconds: number | null): string {
  return `lobby:${boardSize}:${timeControlSeconds ?? "none"}`;
}

const JoinLobbyBody = z.object({
  playerId: z.string().min(1).max(64),
  boardSize: z.union([z.literal(9), z.literal(13), z.literal(19)]).default(19),
  timeControlSeconds: z.number().int().positive().nullable().optional(),
});

const LeaveLobbyBody = z.object({
  playerId: z.string().min(1).max(64),
  boardSize: z.union([z.literal(9), z.literal(13), z.literal(19)]),
  timeControlSeconds: z.number().int().positive().nullable().optional(),
});

async function tryMatch(
  playerId: string,
  boardSize: BoardSize,
  timeControlSeconds: number | null,
): Promise<string | null> {
  const key = lobbyKey(boardSize, timeControlSeconds);
  const waiting = await redis.zpopmin(key, 1);
  if (!waiting || waiting.length < 2) return null;

  const [opponentId] = waiting as [string, string];
  if (opponentId === playerId) {
    await redis.zadd(key, Date.now(), opponentId);
    return null;
  }

  const blackPlayerId = Math.random() < 0.5 ? playerId : opponentId;
  const whitePlayerId = blackPlayerId === playerId ? opponentId : playerId;

  const resp = await fetch(`${GAME_SERVER_URL}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardSize, playerId: blackPlayerId, timeControlSeconds }),
  });

  if (!resp.ok) {
    await redis.zadd(key, Date.now(), opponentId);
    return null;
  }

  const data = (await resp.json()) as { gameId: string; joinToken: string };

  const joinResp = await fetch(`${GAME_SERVER_URL}/games/${data.gameId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joinToken: data.joinToken, playerId: whitePlayerId }),
  });

  if (!joinResp.ok) { console.error("[matchmaker] Failed to join as white"); return null; }

  const event: MatchFoundEvent = {
    version: 1,
    type: "match_found",
    gameId: data.gameId,
    blackPlayerId,
    whitePlayerId,
  };
  await redis.publish("matches", JSON.stringify(event));
  return data.gameId;
}

async function main(): Promise<void> {
  await redis.connect();
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true, service: "matchmaker" }));

  app.post("/lobby/join", async (req, reply) => {
    const body = JoinLobbyBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ ok: false, error: body.error.flatten() });
    const { playerId, boardSize, timeControlSeconds = null } = body.data;
    await redis.zadd(lobbyKey(boardSize, timeControlSeconds ?? null), Date.now(), playerId);
    const gameId = await tryMatch(playerId, boardSize, timeControlSeconds ?? null);
    if (gameId) return reply.send({ ok: true, matched: true, gameId });
    return reply.send({ ok: true, matched: false });
  });

  app.post("/lobby/leave", async (req, reply) => {
    const body = LeaveLobbyBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ ok: false, error: body.error.flatten() });
    const { playerId, boardSize, timeControlSeconds = null } = body.data;
    await redis.zrem(lobbyKey(boardSize, timeControlSeconds ?? null), playerId);
    return reply.send({ ok: true });
  });

  app.get("/lobby/status/:playerId", async (req, reply) => {
    const { playerId } = req.params as { playerId: string };
    for (const size of [9, 13, 19] as BoardSize[]) {
      for (const tc of [null, 30, 60, 300, 600]) {
        const score = await redis.zscore(lobbyKey(size, tc), playerId);
        if (score !== null) return reply.send({ ok: true, inLobby: true, boardSize: size });
      }
    }
    return reply.send({ ok: true, inLobby: false });
  });

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

main().catch((err) => { console.error(err); process.exit(1); });
