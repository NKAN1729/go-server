import { describe, expect, it } from "vitest";
import type { GameState } from "@go-server/shared-types";
import { setCell } from "../board.js";
import { activateGame, applyMoveToGame, createGameState, getScore, isGameOver } from "../game.js";

function freshActive(): GameState {
  return activateGame(createGameState("test-1", 9));
}

describe("createGameState", () => {
  it("creates a game with correct board size", () => { const g = createGameState("id", 9); expect(g.boardSize).toBe(9); expect(g.board).toHaveLength(81); });
  it("creates 13x13 board", () => expect(createGameState("id", 13).board).toHaveLength(169));
  it("initial turn is black", () => expect(createGameState("id", 9).turn).toBe("black"));
  it("initial status is waiting", () => expect(createGameState("id", 9).status).toBe("waiting"));
  it("initial move number is 0", () => expect(createGameState("id", 9).moveNumber).toBe(0));
  it("captures start at 0", () => { const g = createGameState("id", 9); expect(g.capturedBlack).toBe(0); expect(g.capturedWhite).toBe(0); });
  it("result is null initially", () => expect(createGameState("id", 9).result).toBeNull());
  it("uses provided id", () => expect(createGameState("my-id", 9).id).toBe("my-id"));
});

describe("activateGame", () => {
  it("transitions waiting to active", () => expect(activateGame(createGameState("id", 9)).status).toBe("active"));
  it("is idempotent for active game", () => expect(activateGame(freshActive()).status).toBe("active"));
});

describe("applyMoveToGame — guards", () => {
  it("rejects move on waiting game", () => {
    const r = applyMoveToGame(createGameState("id", 9), { kind: "place", point: { row: 0, col: 0 } }, "p1", "black");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("GAME_NOT_ACTIVE");
  });
  it("rejects move on ended game", () => {
    const r = applyMoveToGame({ ...freshActive(), status: "ended" }, { kind: "pass" }, "p1", "black");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("GAME_NOT_ACTIVE");
  });
  it("rejects move when not players turn", () => {
    const r = applyMoveToGame(freshActive(), { kind: "place", point: { row: 0, col: 0 } }, "p2", "white");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_YOUR_TURN");
  });
});

describe("applyMoveToGame — place", () => {
  it("places stone and advances turn", () => {
    const r = applyMoveToGame(freshActive(), { kind: "place", point: { row: 4, col: 4 } }, "p1", "black");
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.state.turn).toBe("white"); expect(r.state.moveNumber).toBe(1); }
  });
  it("returns OCCUPIED for duplicate placement", () => {
    const r1 = applyMoveToGame(freshActive(), { kind: "place", point: { row: 4, col: 4 } }, "p1", "black");
    if (!r1.ok) return;
    const r2 = applyMoveToGame(r1.state, { kind: "place", point: { row: 4, col: 4 } }, "p2", "white");
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error.code).toBe("OCCUPIED");
  });
  it("records capture in state", () => {
    let b = freshActive().board.slice();
    b = setCell(b, { row: 1, col: 1 }, 9, "white") as typeof b;
    b = setCell(b, { row: 0, col: 1 }, 9, "black") as typeof b;
    b = setCell(b, { row: 2, col: 1 }, 9, "black") as typeof b;
    b = setCell(b, { row: 1, col: 0 }, 9, "black") as typeof b;
    const state = { ...freshActive(), board: b };
    const r = applyMoveToGame(state, { kind: "place", point: { row: 1, col: 2 } }, "p1", "black");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.capturedWhite).toBe(1);
  });
});

describe("applyMoveToGame — pass", () => {
  it("switches the turn", () => {
    const r = applyMoveToGame(freshActive(), { kind: "pass" }, "p1", "black");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.turn).toBe("white");
  });
  it("sets lastMove to pass", () => {
    const r = applyMoveToGame(freshActive(), { kind: "pass" }, "p1", "black");
    if (r.ok) expect(r.state.lastMove).toBe("pass");
  });
  it("clears Ko point", () => {
    const r = applyMoveToGame({ ...freshActive(), koPoint: { row: 3, col: 3 } }, { kind: "pass" }, "p1", "black");
    if (r.ok) expect(r.state.koPoint).toBeNull();
  });
  it("does not change the board", () => {
    const g = freshActive();
    const r = applyMoveToGame(g, { kind: "pass" }, "p1", "black");
    if (r.ok) expect(r.state.board).toEqual(g.board);
  });
  it("two consecutive passes end the game", () => {
    const r1 = applyMoveToGame(freshActive(), { kind: "pass" }, "p1", "black");
    if (!r1.ok) return;
    const r2 = applyMoveToGame(r1.state, { kind: "pass" }, "p2", "white");
    expect(r2.ok).toBe(true);
    if (r2.ok) { expect(r2.state.status).toBe("ended"); expect(r2.state.result?.kind).toBe("score"); }
  });
  it("two-pass result has a winner", () => {
    const r1 = applyMoveToGame(freshActive(), { kind: "pass" }, "p1", "black");
    if (!r1.ok) return;
    const r2 = applyMoveToGame(r1.state, { kind: "pass" }, "p2", "white");
    if (r2.ok) expect(r2.state.result && 'winner' in r2.state.result ? r2.state.result.winner : undefined).toBeDefined();
  });
  it("single pass then placement is not game over", () => {
    const r1 = applyMoveToGame(freshActive(), { kind: "pass" }, "p1", "black");
    if (!r1.ok) return;
    const r2 = applyMoveToGame(r1.state, { kind: "place", point: { row: 4, col: 4 } }, "p2", "white");
    if (r2.ok) expect(r2.state.status).toBe("active");
  });
});

describe("applyMoveToGame — resign", () => {
  it("ends the game immediately", () => {
    const r = applyMoveToGame(freshActive(), { kind: "resign" }, "p1", "black");
    if (r.ok) expect(r.state.status).toBe("ended");
  });
  it("opponent wins on resign", () => {
    const r = applyMoveToGame(freshActive(), { kind: "resign" }, "p1", "black");
    if (r.ok) { expect(r.state.result?.kind).toBe("resign"); expect(r.state.result && 'winner' in r.state.result ? r.state.result.winner : undefined).toBe("white"); }
  });
  it("white resigning makes black winner", () => {
    const r1 = applyMoveToGame(freshActive(), { kind: "pass" }, "p1", "black");
    if (!r1.ok) return;
    const r2 = applyMoveToGame(r1.state, { kind: "resign" }, "p2", "white");
    if (r2.ok) expect(r2.state.result && 'winner' in r2.state.result ? r2.state.result.winner : undefined).toBe("black");
  });
});

describe("isGameOver", () => {
  it("false for active game", () => expect(isGameOver(freshActive())).toBe(false));
  it("false for waiting game", () => expect(isGameOver(createGameState("id", 9))).toBe(false));
  it("true for ended game", () => {
    const r = applyMoveToGame(freshActive(), { kind: "resign" }, "p1", "black");
    if (r.ok) expect(isGameOver(r.state)).toBe(true);
  });
});

describe("getScore", () => {
  it("null for active game", () => expect(getScore(freshActive())).toBeNull());
  it("null for resign result", () => {
    const r = applyMoveToGame(freshActive(), { kind: "resign" }, "p1", "black");
    if (r.ok) expect(getScore(r.state)).toBeNull();
  });
  it("returns score after two passes", () => {
    const r1 = applyMoveToGame(freshActive(), { kind: "pass" }, "p1", "black");
    if (!r1.ok) return;
    const r2 = applyMoveToGame(r1.state, { kind: "pass" }, "p2", "white");
    if (!r2.ok) return;
    const score = getScore(r2.state);
    expect(score).not.toBeNull();
    expect(typeof score?.black).toBe("number");
  });
});

describe("Full game simulation", () => {
  it("plays 8 alternating moves without errors", () => {
    let g = freshActive();
    const moves: [number, number][] = [[2,2],[6,6],[2,6],[6,2],[4,4],[1,1],[7,7],[1,7]];
    let color: "black" | "white" = "black";
    for (const [row, col] of moves) {
      const r = applyMoveToGame(g, { kind: "place", point: { row, col } }, "p", color);
      expect(r.ok).toBe(true);
      if (!r.ok) break;
      g = r.state;
      color = color === "black" ? "white" : "black";
    }
    expect(g.moveNumber).toBe(8);
  });
  it("game ends after move then two passes", () => {
    const r1 = applyMoveToGame(freshActive(), { kind: "place", point: { row: 4, col: 4 } }, "p1", "black");
    if (!r1.ok) return;
    const r2 = applyMoveToGame(r1.state, { kind: "pass" }, "p2", "white");
    if (!r2.ok) return;
    const r3 = applyMoveToGame(r2.state, { kind: "pass" }, "p1", "black");
    if (r3.ok) { expect(r3.state.status).toBe("ended"); expect(r3.state.result?.kind).toBe("score"); }
  });
});
