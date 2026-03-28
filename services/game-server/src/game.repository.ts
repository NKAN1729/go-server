import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { BoardSize, GameState, MovePayload } from "@go-server/shared-types";
import { createGameState } from "@go-server/go-game";
import { db } from "./db/client.js";
import { games, moves } from "./db/schema.js";
import type { GameInsert, GameRow } from "./db/schema.js";

export async function findGame(gameId: string): Promise<GameRow | null> {
  const rows = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return rows[0] ?? null;
}

export async function findGameByToken(joinToken: string): Promise<GameRow | null> {
  const rows = await db.select().from(games).where(eq(games.joinToken, joinToken)).limit(1);
  return rows[0] ?? null;
}

export function rowToGameState(row: GameRow): GameState {
  return row.stateJson as GameState;
}

export async function createGame(
  boardSize: BoardSize,
  blackPlayerId: string,
  timeControlSeconds?: number,
  versusBot = false,
  botDifficulty?: string,
): Promise<GameRow> {
  const id = nanoid();
  const joinToken = nanoid(16);
  const state = createGameState(id, boardSize);
  const insert: GameInsert = {
    id,
    boardSize,
    status: "waiting",
    blackPlayerId,
    joinToken,
    stateJson: state,
    timeControlSeconds: timeControlSeconds ?? null,
    versusBot: versusBot ? 1 : 0,
    botDifficulty: botDifficulty ?? null,
  };
  const [row] = await db.insert(games).values(insert).returning();
  return row!;
}

export async function updateGameState(
  gameId: string,
  newState: GameState,
  whitePlayerId?: string,
): Promise<void> {
  await db.update(games).set({
    stateJson: newState,
    status: newState.status,
    ...(whitePlayerId ? { whitePlayerId } : {}),
    updatedAt: new Date(),
  }).where(eq(games.id, gameId));
}

export async function recordMove(
  gameId: string,
  moveNumber: number,
  color: "black" | "white",
  move: MovePayload,
): Promise<void> {
  await db.insert(moves).values({ gameId, moveNumber, color, moveJson: move });
}
