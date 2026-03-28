import { describe, expect, it } from "vitest";
import type { BoardSize } from "@go-server/shared-types";
import { emptyBoard, opponent, setCell } from "../board.js";
import { activateGame, applyMoveToGame, createGameState } from "../game.js";
import { applyMove, scoreBoard } from "../rules.js";

const S9: BoardSize = 9;
const S19: BoardSize = 19;

function freshGame(size: BoardSize = S9) {
  return activateGame(createGameState("test", size));
}

describe("Board invariants", () => {
  it("board length equals size squared for 9x9", () => expect(emptyBoard(9)).toHaveLength(81));
  it("board length equals size squared for 13x13", () => expect(emptyBoard(13)).toHaveLength(169));
  it("board length equals size squared for 19x19", () => expect(emptyBoard(19)).toHaveLength(361));
  it("set returns new array", () => {
    const b = emptyBoard(9);
    const b2 = setCell(b, { row: 0, col: 0 }, 9, "black");
    expect(b).not.toBe(b2);
    expect(b[0]).toBe("empty");
    expect(b2[0]).toBe("black");
  });
  it("opponent is self-inverse for black", () => expect(opponent(opponent("black"))).toBe("black"));
  it("opponent is self-inverse for white", () => expect(opponent(opponent("white"))).toBe("white"));
});

describe("Ko fight", () => {
  it("Ko point blocks immediate recapture", () => {
    const state = { ...freshGame(), koPoint: { row: 3, col: 3 } };
    const r = applyMoveToGame(state, { kind: "place", point: { row: 3, col: 3 } }, "p1", "black");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("KO_VIOLATION");
  });
  it("Ko cleared after pass", () => {
    const r = applyMoveToGame({ ...freshGame(), koPoint: { row: 3, col: 3 } }, { kind: "pass" }, "p1", "black");
    if (r.ok) expect(r.state.koPoint).toBeNull();
  });
  it("Ko cleared after normal move elsewhere", () => {
    const r = applyMoveToGame({ ...freshGame(), koPoint: { row: 3, col: 3 } }, { kind: "place", point: { row: 8, col: 8 } }, "p1", "black");
    if (r.ok) { const ko = r.state.koPoint; expect(ko?.row === 3 && ko?.col === 3).toBe(false); }
  });
});

describe("Territory counting", () => {
  it("captures counted for scoring", () => {
    const s = scoreBoard(emptyBoard(S9), S9, 5, 3, 0);
    expect(s.black).toBe(3); expect(s.white).toBe(5);
  });
  it("komi shifts winner on empty board", () => {
    const s = scoreBoard(emptyBoard(S9), S9, 0, 0, 6.5);
    expect(s.white).toBeGreaterThan(s.black);
  });
});

describe("19x19 game basics", () => {
  it("creates a valid 19x19 game", () => {
    const g = freshGame(S19);
    expect(g.boardSize).toBe(19);
    expect(g.board).toHaveLength(361);
  });
  it("places stones at all four corners of 19x19", () => {
    const g = freshGame(S19);
    let state = g;
    let color: "black" | "white" = "black";
    for (const point of [[0,0],[0,18],[18,0],[18,18]] as [number,number][]) { const [row, col] = point;
      const r = applyMoveToGame(state, { kind: "place", point: { row, col } }, "p", color);
      expect(r.ok).toBe(true);
      if (r.ok) state = r.state;
      color = color === "black" ? "white" : "black";
    }
    expect(state.moveNumber).toBe(4);
  });
  it("places stones at all nine star points", () => {
    const g = freshGame(S19);
    let state = g;
    let color: "black" | "white" = "black";
    for (const point of [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]] as [number,number][]) { const [row, col] = point;
      const r = applyMoveToGame(state, { kind: "place", point: { row, col } }, "p", color);
      expect(r.ok).toBe(true);
      if (r.ok) state = r.state;
      color = color === "black" ? "white" : "black";
    }
    expect(state.moveNumber).toBe(9);
  });
});

describe("Turn alternation", () => {
  it("turns alternate correctly over 10 moves", () => {
    let g = freshGame();
    const positions: [number,number][] = [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1],[3,0],[3,1],[4,0],[4,1]];
    const expected: ("black"|"white")[] = ["black","white","black","white","black","white","black","white","black","white"];
    for (let i = 0; i < positions.length; i++) {
      expect(g.turn).toBe(expected[i]);
      const [row, col] = positions[i]!;
      const r = applyMoveToGame(g, { kind: "place", point: { row, col } }, "p", g.turn);
      if (r.ok) g = r.state;
    }
    expect(g.moveNumber).toBe(10);
  });
});

describe("Game state immutability", () => {
  it("applyMoveToGame does not mutate input state", () => {
    const g = freshGame();
    const boardBefore = [...g.board];
    const turnBefore = g.turn;
    applyMoveToGame(g, { kind: "place", point: { row: 4, col: 4 } }, "p", "black");
    expect(g.turn).toBe(turnBefore);
    expect([...g.board]).toEqual(boardBefore);
  });
  it("each valid move returns a new state object", () => {
    const g = freshGame();
    const r = applyMoveToGame(g, { kind: "pass" }, "p", "black");
    if (r.ok) expect(r.state).not.toBe(g);
  });
});

describe("All MoveErrorCodes reachable", () => {
  it("OUT_OF_BOUNDS", () => {
    const r = applyMove(emptyBoard(S9), { row: 99, col: 0 }, "black", S9, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("OUT_OF_BOUNDS");
  });
  it("OCCUPIED", () => {
    const b = setCell(emptyBoard(S9), { row: 4, col: 4 }, S9, "black");
    const r = applyMove(b, { row: 4, col: 4 }, "white", S9, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("OCCUPIED");
  });
  it("KO_VIOLATION", () => {
    const ko = { row: 3, col: 3 };
    const r = applyMove(emptyBoard(S9), ko, "black", S9, ko);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("KO_VIOLATION");
  });
  it("SUICIDE", () => {
    let b = emptyBoard(S9);
    b = setCell(b, { row: 0, col: 1 }, S9, "white");
    b = setCell(b, { row: 1, col: 0 }, S9, "white");
    const r = applyMove(b, { row: 0, col: 0 }, "black", S9, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("SUICIDE");
  });
  it("NOT_YOUR_TURN", () => {
    const r = applyMoveToGame(freshGame(), { kind: "pass" }, "p", "white");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_YOUR_TURN");
  });
  it("GAME_NOT_ACTIVE", () => {
    const r = applyMoveToGame({ ...freshGame(), status: "ended" }, { kind: "pass" }, "p", "black");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("GAME_NOT_ACTIVE");
  });
});
