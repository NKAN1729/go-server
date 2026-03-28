/**
 * api.ts
 * Typed HTTP client for game-server. No React, no WS.
 * All server shapes live here as DTOs.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ── DTOs (mirror server shapes) ─────────────────────────────────────────────

export type Color = "black" | "white";
export type Cell  = Color | "empty";

export interface GameStateDTO {
  id:           string;
  board:        Cell[][];   // [row][col], 19×19
  turn:         Color;
  captures:     { black: number; white: number };
  status:       "playing" | "finished";
  winner:       Color | null;
  lastMove:     [number, number] | null;  // [row, col]
  moveNumber:   number;
  players:      { black: string; white: string };
  botDifficulty?: "beginner" | "easy" | "medium" | "hard" | "expert";
}

export interface CreateGamePayload {
  boardSize?:    9 | 13 | 19;
  vsBot?:        boolean;
  botDifficulty?: GameStateDTO["botDifficulty"];
  playerName?:   string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── API calls ────────────────────────────────────────────────────────────────

export const api = {
  createGame: (payload: CreateGamePayload) =>
    request<GameStateDTO>("/api/games", {
      method: "POST",
      body:   JSON.stringify(payload),
    }),

  getGame: (id: string) =>
    request<GameStateDTO>(`/api/games/${id}`),

  placeMove: (id: string, row: number, col: number) =>
    request<GameStateDTO>(`/api/games/${id}/move`, {
      method: "POST",
      body:   JSON.stringify({ row, col }),
    }),

  pass: (id: string) =>
    request<GameStateDTO>(`/api/games/${id}/pass`, {
      method: "POST",
    }),

  resign: (id: string) =>
    request<GameStateDTO>(`/api/games/${id}/resign`, {
      method: "POST",
    }),
};
