import { describe, expect, it } from "vitest";
import type { Board, BoardSize } from "@go-server/shared-types";
import { emptyBoard, setCell } from "../board.js";
import { applyMove, applyPass, scoreBoard } from "../rules.js";

const S: BoardSize = 9;

function place(board: Board, row: number, col: number, color: "black" | "white"): Board {
  return setCell(board, { row, col }, S, color);
}

describe("applyMove — bounds", () => {
  it("rejects row too large", () => {
    const r = applyMove(emptyBoard(S), { row: 9, col: 0 }, "black", S, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("OUT_OF_BOUNDS");
  });
  it("rejects negative col", () => {
    const r = applyMove(emptyBoard(S), { row: 0, col: -1 }, "black", S, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("OUT_OF_BOUNDS");
  });
  it("accepts (0,0)", () => expect(applyMove(emptyBoard(S), { row: 0, col: 0 }, "black", S, null).valid).toBe(true));
  it("accepts (8,8)", () => expect(applyMove(emptyBoard(S), { row: 8, col: 8 }, "black", S, null).valid).toBe(true));
});

describe("applyMove — occupied", () => {
  it("rejects same color", () => {
    const r = applyMove(place(emptyBoard(S), 4, 4, "black"), { row: 4, col: 4 }, "black", S, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("OCCUPIED");
  });
  it("rejects other color", () => {
    const r = applyMove(place(emptyBoard(S), 4, 4, "white"), { row: 4, col: 4 }, "black", S, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("OCCUPIED");
  });
});

describe("applyMove — placement", () => {
  it("places a black stone", () => {
    const r = applyMove(emptyBoard(S), { row: 3, col: 3 }, "black", S, null);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.board[3 * S + 3]).toBe("black");
  });
  it("does not mutate original board", () => {
    const b = emptyBoard(S);
    applyMove(b, { row: 3, col: 3 }, "black", S, null);
    expect(b[3 * S + 3]).toBe("empty");
  });
  it("capture counts zero when no capture", () => {
    const r = applyMove(emptyBoard(S), { row: 4, col: 4 }, "black", S, null);
    if (r.valid) { expect(r.capturedBlack).toBe(0); expect(r.capturedWhite).toBe(0); }
  });
});

describe("applyMove — capture", () => {
  it("captures a single surrounded stone", () => {
    let b = emptyBoard(S);
    b = place(b, 1, 1, "white");
    b = place(b, 0, 1, "black");
    b = place(b, 2, 1, "black");
    b = place(b, 1, 0, "black");
    const r = applyMove(b, { row: 1, col: 2 }, "black", S, null);
    expect(r.valid).toBe(true);
    if (r.valid) { expect(r.capturedWhite).toBe(1); expect(r.board[1 * S + 1]).toBe("empty"); }
  });
  it("captures a 2-stone chain", () => {
    let b = emptyBoard(S);
    b = place(b, 1, 1, "white"); b = place(b, 1, 2, "white");
    b = place(b, 0, 1, "black"); b = place(b, 0, 2, "black");
    b = place(b, 1, 0, "black"); b = place(b, 1, 3, "black");
    b = place(b, 2, 2, "black");
    const r = applyMove(b, { row: 2, col: 1 }, "black", S, null);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.capturedWhite).toBe(2);
  });
});

describe("applyMove — suicide", () => {
  it("rejects suicide into surrounded point", () => {
    let b = emptyBoard(S);
    b = place(b, 0, 1, "white"); b = place(b, 2, 1, "white");
    b = place(b, 1, 0, "white"); b = place(b, 1, 2, "white");
    const r = applyMove(b, { row: 1, col: 1 }, "black", S, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("SUICIDE");
  });
  it("rejects suicide in corner", () => {
    let b = emptyBoard(S);
    b = place(b, 0, 1, "white"); b = place(b, 1, 0, "white");
    const r = applyMove(b, { row: 0, col: 0 }, "black", S, null);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("SUICIDE");
  });
});

describe("applyMove — Ko", () => {
  it("rejects placement at Ko point", () => {
    const ko = { row: 3, col: 3 };
    const r = applyMove(emptyBoard(S), ko, "black", S, ko);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.code).toBe("KO_VIOLATION");
  });
  it("allows placement elsewhere when Ko active", () => {
    const r = applyMove(emptyBoard(S), { row: 4, col: 4 }, "black", S, { row: 3, col: 3 });
    expect(r.valid).toBe(true);
  });
  it("no Ko point when move does not capture", () => {
    const r = applyMove(emptyBoard(S), { row: 4, col: 4 }, "black", S, null);
    if (r.valid) expect(r.newKoPoint).toBeNull();
  });
  it("no Ko point when capturing 2+ stones", () => {
    let b = emptyBoard(S);
    b = place(b, 1, 1, "black"); b = place(b, 1, 2, "black");
    b = place(b, 0, 1, "white"); b = place(b, 0, 2, "white");
    b = place(b, 1, 0, "white"); b = place(b, 1, 3, "white");
    b = place(b, 2, 2, "white");
    const r = applyMove(b, { row: 2, col: 1 }, "white", S, null);
    if (r.valid) expect(r.newKoPoint).toBeNull();
  });
});

describe("applyPass", () => {
  it("returns same board unchanged", () => { const b = emptyBoard(S); expect(applyPass(b).board).toEqual(b); });
  it("clears Ko point", () => expect(applyPass(emptyBoard(S)).newKoPoint).toBeNull());
  it("does not mutate original", () => {
    const b = place(emptyBoard(S), 3, 3, "black");
    const original = [...b];
    applyPass(b);
    expect([...b]).toEqual(original);
  });
});

describe("scoreBoard", () => {
  it("empty board scores 0 territory for both", () => {
    const s = scoreBoard(emptyBoard(S), S, 0, 0, 6.5);
    expect(s.black).toBe(0); expect(s.white).toBe(6.5);
  });
  it("captures add to score", () => {
    const s = scoreBoard(emptyBoard(S), S, 3, 2, 0);
    expect(s.black).toBe(2); expect(s.white).toBe(3);
  });
  it("komi is added to white score", () => {
    const s = scoreBoard(emptyBoard(S), S, 0, 0, 7.5);
    expect(s.white).toBe(7.5); expect(s.komi).toBe(7.5);
  });
  it("komi 7.5 Chinese rules", () => expect(scoreBoard(emptyBoard(S), S, 0, 0, 7.5).komi).toBe(7.5));
  it("komi 0 makes empty board a draw", () => {
    const s = scoreBoard(emptyBoard(S), S, 0, 0, 0);
    expect(s.black).toBe(0); expect(s.white).toBe(0);
  });
  it("accepts 13x13 board", () => {
    const r = applyMove(emptyBoard(13), { row: 6, col: 6 }, "black", 13, null);
    expect(r.valid).toBe(true);
  });
  it("rejects out-of-bounds on 13x13", () => {
    const r = applyMove(emptyBoard(13), { row: 13, col: 0 }, "black", 13, null);
    expect(r.valid).toBe(false);
  });
  it("accepts all four corners of 19x19", () => {
    for (const point of [[0,0],[0,18],[18,0],[18,18]] as [number,number][]) { const [row, col] = point;
      expect(applyMove(emptyBoard(19), { row, col }, "black", 19, null).valid).toBe(true);
    }
  });
  it("rejects row 19 on 19x19", () => {
    expect(applyMove(emptyBoard(19), { row: 19, col: 0 }, "black", 19, null).valid).toBe(false);
  });
});
