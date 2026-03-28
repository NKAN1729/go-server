/**
 * useGame.ts
 * The ONE hook that owns all game state.
 * Components read from it; they never touch WsClient or api directly.
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { api, type GameStateDTO } from "../lib/api";
import { WsClient }              from "../lib/wsClient";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";

// ── State shape ──────────────────────────────────────────────────────────────

interface GameHookState {
  game:    GameStateDTO | null;
  loading: boolean;
  error:   string | null;
}

type Action =
  | { type: "SET_GAME";  game: GameStateDTO }
  | { type: "SET_LOAD";  loading: boolean }
  | { type: "SET_ERROR"; error: string };

function reducer(state: GameHookState, action: Action): GameHookState {
  switch (action.type) {
    case "SET_GAME":  return { ...state, game: action.game,  loading: false, error: null };
    case "SET_LOAD":  return { ...state, loading: action.loading };
    case "SET_ERROR": return { ...state, error: action.error, loading: false };
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useGame(gameId: string | null) {
  const [state, dispatch] = useReducer(reducer, {
    game: null, loading: false, error: null,
  });

  const wsRef = useRef<WsClient | null>(null);

  // Initial load
  useEffect(() => {
    if (!gameId) return;
    dispatch({ type: "SET_LOAD", loading: true });
    api.getGame(gameId)
      .then((g) => dispatch({ type: "SET_GAME", game: g }))
      .catch((e) => dispatch({ type: "SET_ERROR", error: String(e) }));
  }, [gameId]);

  // WebSocket subscription
  useEffect(() => {
    if (!gameId) return;
    const ws = new WsClient(`${WS_URL}?gameId=${gameId}`);
    wsRef.current = ws;
    ws.connect();

    const unsub = ws.subscribe((msg) => {
      if (msg.type === "game_state") dispatch({ type: "SET_GAME", game: msg.payload });
      if (msg.type === "error")      dispatch({ type: "SET_ERROR", error: msg.payload.message });
    });

    return () => {
      unsub();
      ws.disconnect();
    };
  }, [gameId]);

  // Actions — each returns a promise so callers can handle optimistic UI
  const placeStone = useCallback(async (row: number, col: number) => {
    if (!gameId) return;
    try {
      const g = await api.placeMove(gameId, row, col);
      dispatch({ type: "SET_GAME", game: g });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: String(e) });
    }
  }, [gameId]);

  const pass = useCallback(async () => {
    if (!gameId) return;
    try {
      const g = await api.pass(gameId);
      dispatch({ type: "SET_GAME", game: g });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: String(e) });
    }
  }, [gameId]);

  const resign = useCallback(async () => {
    if (!gameId) return;
    try {
      const g = await api.resign(gameId);
      dispatch({ type: "SET_GAME", game: g });
    } catch (e) {
      dispatch({ type: "SET_ERROR", error: String(e) });
    }
  }, [gameId]);

  return { ...state, placeStone, pass, resign };
}
