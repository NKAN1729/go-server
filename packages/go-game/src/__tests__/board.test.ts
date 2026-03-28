import { describe, expect, it } from "vitest";

import {
  boardToString,
  emptyBoard,
  findChain,
  getCell,
  indexToPoint,
  isOnBoard,
  libertyCount,
  neighbours,
  opponent,
  pointToIndex,
  pointsEqual,
  removeCaptured,
  setCell,
} from "../board.js";

describe("emptyBoard", () => {
  it("creates a 9x9 board with 81 cells", () => expect(emptyBoard(9)).toHaveLength(81));
  it("creates a 13x13 board with 169 cells", () => expect(emptyBoard(13)).toHaveLength(169));
  it("creates a 19x19 board with 361 cells", () => expect(emptyBoard(19)).toHaveLength(361));
  it("all cells are empty", () => expect(emptyBoard(9).every((c) => c === "empty")).toBe(true));
});

describe("pointToIndex", () => {
  it("top-left corner is index 0", () => expect(pointToIndex({ row: 0, col: 0 }, 9)).toBe(0));
  it("first row second column is index 1", () => expect(pointToIndex({ row: 0, col: 1 }, 9)).toBe(1));
  it("second row first column is index 9", () => expect(pointToIndex({ row: 1, col: 0 }, 9)).toBe(9));
  it("bottom-right of 9x9 is index 80", () => expect(pointToIndex({ row: 8, col: 8 }, 9)).toBe(80));
  it("centre of 19x19 is correct", () => expect(pointToIndex({ row: 9, col: 9 }, 19)).toBe(9 * 19 + 9));
});

describe("indexToPoint", () => {
  it("index 0 is (0,0)", () => expect(indexToPoint(0, 9)).toEqual({ row: 0, col: 0 }));
  it("index 1 is (0,1)", () => expect(indexToPoint(1, 9)).toEqual({ row: 0, col: 1 }));
  it("index 9 is (1,0)", () => expect(indexToPoint(9, 9)).toEqual({ row: 1, col: 0 }));
  it("round-trip pointToIndex to indexToPoint", () => {
    const point = { row: 3, col: 5 };
    expect(indexToPoint(pointToIndex(point, 9), 9)).toEqual(point);
  });
});

describe("isOnBoard", () => {
  it("(0,0) is on a 9x9 board", () => expect(isOnBoard({ row: 0, col: 0 }, 9)).toBe(true));
  it("(8,8) is on a 9x9 board", () => expect(isOnBoard({ row: 8, col: 8 }, 9)).toBe(true));
  it("(9,0) is off a 9x9 board", () => expect(isOnBoard({ row: 9, col: 0 }, 9)).toBe(false));
  it("(-1,0) is off the board", () => expect(isOnBoard({ row: -1, col: 0 }, 9)).toBe(false));
  it("(0,-1) is off the board", () => expect(isOnBoard({ row: 0, col: -1 }, 9)).toBe(false));
  it("(0,9) is off a 9x9 board", () => expect(isOnBoard({ row: 0, col: 9 }, 9)).toBe(false));
});

describe("pointsEqual", () => {
  it("same point is equal", () => expect(pointsEqual({ row: 1, col: 2 }, { row: 1, col: 2 })).toBe(true));
  it("different row", () => expect(pointsEqual({ row: 1, col: 2 }, { row: 2, col: 2 })).toBe(false));
  it("different col", () => expect(pointsEqual({ row: 1, col: 2 }, { row: 1, col: 3 })).toBe(false));
});

describe("getCell / setCell", () => {
  it("getCell returns empty on new board", () => expect(getCell(emptyBoard(9), { row: 0, col: 0 }, 9)).toBe("empty"));
  it("setCell returns new board with cell changed", () => {
    const b = setCell(emptyBoard(9), { row: 2, col: 3 }, 9, "black");
    expect(getCell(b, { row: 2, col: 3 }, 9)).toBe("black");
  });
  it("setCell does not mutate original", () => {
    const b = emptyBoard(9);
    setCell(b, { row: 0, col: 0 }, 9, "white");
    expect(getCell(b, { row: 0, col: 0 }, 9)).toBe("empty");
  });
  it("can overwrite a stone", () => {
    const b = setCell(emptyBoard(9), { row: 0, col: 0 }, 9, "black");
    expect(getCell(setCell(b, { row: 0, col: 0 }, 9, "white"), { row: 0, col: 0 }, 9)).toBe("white");
  });
});

describe("neighbours", () => {
  it("corner (0,0) has 2 neighbours", () => expect(neighbours({ row: 0, col: 0 }, 9)).toHaveLength(2));
  it("edge (0,4) has 3 neighbours", () => expect(neighbours({ row: 0, col: 4 }, 9)).toHaveLength(3));
  it("centre (4,4) has 4 neighbours", () => expect(neighbours({ row: 4, col: 4 }, 9)).toHaveLength(4));
  it("all neighbours are on the board", () => expect(neighbours({ row: 1, col: 1 }, 9).every((p) => isOnBoard(p, 9))).toBe(true));
  it("neighbours of (0,0) are (0,1) and (1,0)", () => {
    const nbs = neighbours({ row: 0, col: 0 }, 9);
    expect(nbs).toContainEqual({ row: 0, col: 1 });
    expect(nbs).toContainEqual({ row: 1, col: 0 });
  });
});

describe("findChain", () => {
  it("returns null for empty cell", () => expect(findChain(emptyBoard(9), { row: 0, col: 0 }, 9)).toBeNull());
  it("single stone has 2 liberties in corner", () => {
    const b = setCell(emptyBoard(9), { row: 0, col: 0 }, 9, "black");
    expect(findChain(b, { row: 0, col: 0 }, 9)?.liberties.size).toBe(2);
  });
  it("single stone has 4 liberties in centre", () => {
    const b = setCell(emptyBoard(9), { row: 4, col: 4 }, 9, "black");
    expect(findChain(b, { row: 4, col: 4 }, 9)?.liberties.size).toBe(4);
  });
  it("two connected stones form one chain", () => {
    let b = setCell(emptyBoard(9), { row: 0, col: 0 }, 9, "black");
    b = setCell(b, { row: 0, col: 1 }, 9, "black");
    expect(findChain(b, { row: 0, col: 0 }, 9)?.points.size).toBe(2);
  });
  it("diagonal stones are separate chains", () => {
    let b = setCell(emptyBoard(9), { row: 0, col: 0 }, 9, "black");
    b = setCell(b, { row: 1, col: 1 }, 9, "black");
    expect(findChain(b, { row: 0, col: 0 }, 9)?.points.size).toBe(1);
  });
});

describe("libertyCount", () => {
  it("returns 0 for empty cell", () => expect(libertyCount(emptyBoard(9), { row: 0, col: 0 }, 9)).toBe(0));
  it("single stone in centre has 4 liberties", () => {
    expect(libertyCount(setCell(emptyBoard(9), { row: 4, col: 4 }, 9, "black"), { row: 4, col: 4 }, 9)).toBe(4);
  });
});

describe("removeCaptured", () => {
  it("does not remove stones with liberties", () => {
    const b = setCell(emptyBoard(9), { row: 4, col: 4 }, 9, "black");
    const [result, count] = removeCaptured(b, "black", 9);
    expect(count).toBe(0);
    expect(getCell(result, { row: 4, col: 4 }, 9)).toBe("black");
  });
  it("removes a surrounded single stone", () => {
    let b = setCell(emptyBoard(9), { row: 1, col: 1 }, 9, "white");
    b = setCell(b, { row: 0, col: 1 }, 9, "black");
    b = setCell(b, { row: 2, col: 1 }, 9, "black");
    b = setCell(b, { row: 1, col: 0 }, 9, "black");
    b = setCell(b, { row: 1, col: 2 }, 9, "black");
    const [result, count] = removeCaptured(b, "white", 9);
    expect(count).toBe(1);
    expect(getCell(result, { row: 1, col: 1 }, 9)).toBe("empty");
  });
});

describe("opponent", () => {
  it("opponent of black is white", () => expect(opponent("black")).toBe("white"));
  it("opponent of white is black", () => expect(opponent("white")).toBe("black"));
});

describe("boardToString", () => {
  it("contains dots for empty cells", () => expect(boardToString(emptyBoard(9), 9)).toContain("·"));
  it("contains black stone symbol", () => expect(boardToString(setCell(emptyBoard(9), { row: 0, col: 0 }, 9, "black"), 9)).toContain("●"));
  it("contains white stone symbol", () => expect(boardToString(setCell(emptyBoard(9), { row: 0, col: 0 }, 9, "white"), 9)).toContain("○"));
});
