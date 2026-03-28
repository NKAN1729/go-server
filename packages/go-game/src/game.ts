import type {
  BoardSize,
  Color,
  GameResult,
  GameState,
  MoveError,
  MovePayload,
} from "@go-server/shared-types";
import { emptyBoard, opponent } from "./board.js";
import { applyMove, applyPass, scoreBoard } from "./rules.js";

export function createGameState(
  id: string,
  boardSize: BoardSize,
  now: string = new Date().toISOString(),
): GameState {
  return {
    id,
    boardSize,
    board: emptyBoard(boardSize),
    turn: "black",
    status: "waiting",
    result: null,
    capturedBlack: 0,
    capturedWhite: 0,
    moveNumber: 0,
    lastMove: null,
    koPoint: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function activateGame(state: GameState): GameState {
  if (state.status !== "waiting") return state;
  return { ...state, status: "active", updatedAt: new Date().toISOString() };
}

export type ApplyMoveResult =
  | { ok: true; state: GameState }
  | { ok: false; error: MoveError };

export function applyMoveToGame(
  state: GameState,
  move: MovePayload,
  playerId: string,
  playerColor: Color,
): ApplyMoveResult {
  if (state.status !== "active") {
    return err("GAME_NOT_ACTIVE", "This game is not active");
  }

  if (state.turn !== playerColor) {
    return err("NOT_YOUR_TURN", `It is ${state.turn}'s turn`);
  }

  const now = new Date().toISOString();

  if (move.kind === "resign") {
    const result: GameResult = { kind: "resign", winner: opponent(playerColor) };
    return { ok: true, state: { ...state, status: "ended", result, updatedAt: now } };
  }

  if (move.kind === "pass") {
    const { board, newKoPoint } = applyPass(state.board);
    const isSecondConsecutivePass = state.lastMove === "pass";

    const base: GameState = {
      ...state,
      board,
      turn: opponent(state.turn),
      moveNumber: state.moveNumber + 1,
      lastMove: "pass",
      koPoint: newKoPoint,
      updatedAt: now,
    };

    if (isSecondConsecutivePass) {
      const score = scoreBoard(board, state.boardSize, state.capturedBlack, state.capturedWhite);
      const winner: Color = score.black > score.white ? "black" : "white";
      const result: GameResult = {
        kind: "score",
        winner,
        blackScore: score.black,
        whiteScore: score.white,
      };
      return { ok: true, state: { ...base, status: "ended", result } };
    }

    return { ok: true, state: base };
  }

  const { point } = move;
  const result = applyMove(state.board, point, state.turn, state.boardSize, state.koPoint);

  if (!result.valid) {
    return err(result.code, result.reason);
  }

  return {
    ok: true,
    state: {
      ...state,
      board: result.board,
      turn: opponent(state.turn),
      capturedBlack: state.capturedBlack + result.capturedBlack,
      capturedWhite: state.capturedWhite + result.capturedWhite,
      moveNumber: state.moveNumber + 1,
      lastMove: point,
      koPoint: result.newKoPoint,
      updatedAt: now,
    },
  };
}

function err(code: MoveError["code"], message: string): { ok: false; error: MoveError } {
  return { ok: false, error: { ok: false, code, message } };
}

export function isGameOver(state: GameState): boolean {
  return state.status === "ended";
}

export function getScore(state: GameState) {
  if (state.status !== "ended" || !state.result) return null;
  if (state.result.kind !== "score") return null;
  return { black: state.result.blackScore, white: state.result.whiteScore };
}
