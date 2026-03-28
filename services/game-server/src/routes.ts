import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { activateGame, applyMoveToGame } from "@go-server/go-game";
import type { Color } from "@go-server/shared-types";
import { createGame, findGame, recordMove, rowToGameState, updateGameState } from "./game.repository.js";
import { publishGameEvent } from "./redis.js";

const CreateGameBody = z.object({
  boardSize: z.union([z.literal(9), z.literal(13), z.literal(19)]).default(19),
  playerId: z.string().min(1).max(64),
  timeControlSeconds: z.number().int().positive().optional(),
  versusBot: z.boolean().optional().default(false),
  botDifficulty: z.enum(["beginner", "easy", "medium", "hard", "expert"]).optional(),
});

const JoinGameBody = z.object({
  joinToken: z.string().min(1),
  playerId: z.string().min(1).max(64),
});

const MakeMoveBody = z.object({
  playerId: z.string().min(1).max(64),
  move: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("place"), point: z.object({ row: z.number().int().min(0), col: z.number().int().min(0) }) }),
    z.object({ kind: z.literal("pass") }),
    z.object({ kind: z.literal("resign") }),
  ]),
});

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ ok: true, service: "game-server" }));

  app.post("/games", async (req, reply) => {
    const body = CreateGameBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ ok: false, error: body.error.flatten() });
    const { boardSize, playerId, timeControlSeconds, versusBot, botDifficulty } = body.data;
    const row = await createGame(boardSize, playerId, timeControlSeconds, versusBot, botDifficulty);
    return reply.status(201).send({ ok: true, gameId: row.id, joinToken: row.joinToken });
  });

  app.post("/games/:id/join", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = JoinGameBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ ok: false, error: body.error.flatten() });
    const row = await findGame(id);
    if (!row) return reply.status(404).send({ ok: false, error: "Game not found" });
    if (row.status !== "waiting") return reply.status(409).send({ ok: false, error: "Game is not in waiting state" });
    if (row.joinToken !== body.data.joinToken) return reply.status(403).send({ ok: false, error: "Invalid join token" });
    const state = rowToGameState(row);
    const activeState = activateGame(state);
    await updateGameState(id, activeState, body.data.playerId);
    await publishGameEvent({ version: 1, type: "player_joined", gameId: id, color: "white" });
    return reply.send({ ok: true, state: activeState, color: "white" });
  });

  app.get("/games/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await findGame(id);
    if (!row) return reply.status(404).send({ ok: false, error: "Game not found" });
    return reply.send({ ok: true, state: rowToGameState(row) });
  });

  app.post("/games/:id/move", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = MakeMoveBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ ok: false, error: body.error.flatten() });
    const { playerId, move } = body.data;
    const row = await findGame(id);
    if (!row) return reply.status(404).send({ ok: false, error: "Game not found" });
    const state = rowToGameState(row);
    const color: Color | null =
      row.blackPlayerId === playerId ? "black"
      : row.whitePlayerId === playerId ? "white"
      : null;
    if (!color) return reply.status(403).send({ ok: false, code: "PLAYER_NOT_IN_GAME", message: "You are not a player in this game" });
    const result = applyMoveToGame(state, move, playerId, color);
    if (!result.ok) return reply.status(422).send(result.error);
    await updateGameState(id, result.state);
    await recordMove(id, result.state.moveNumber, color, move);
    await publishGameEvent({ version: 1, type: "move_made", gameId: id, state: result.state });
    if (result.state.status === "ended") {
      await publishGameEvent({ version: 1, type: "game_ended", gameId: id, result: result.state.result! });
    }
    return reply.send({ ok: true, state: result.state });
  });
}
