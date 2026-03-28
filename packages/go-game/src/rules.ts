import type { Board, BoardSize, Color, MoveErrorCode, Point } from "@go-server/shared-types";
import {
  emptyBoard,
  findChain,
  getCell,
  isOnBoard,
  opponent,
  pointsEqual,
  removeCaptured,
  setCell,
} from "./board.js";

export type MoveResult =
  | {
      valid: true;
      board: Board;
      capturedBlack: number;
      capturedWhite: number;
      newKoPoint: Point | null;
    }
  | {
      valid: false;
      code: MoveErrorCode;
      reason: string;
    };

export function applyMove(
  board: Board,
  point: Point,
  color: Color,
  size: BoardSize,
  koPoint: Point | null,
): MoveResult {
  if (!isOnBoard(point, size)) {
    return { valid: false, code: "OUT_OF_BOUNDS", reason: `(${point.row},${point.col}) is off the board` };
  }

  if (getCell(board, point, size) !== "empty") {
    return { valid: false, code: "OCCUPIED", reason: `(${point.row},${point.col}) is already occupied` };
  }

  if (koPoint !== null && pointsEqual(point, koPoint)) {
    return { valid: false, code: "KO_VIOLATION", reason: `Ko rule prevents playing at (${point.row},${point.col})` };
  }

  let next = setCell(board, point, size, color);

  const opp = opponent(color);
  const [afterCapture, capturedOpponent] = removeCaptured(next, opp, size);
  next = afterCapture;

  const chain = findChain(next, point, size);
  if (!chain || chain.liberties.size === 0) {
    return { valid: false, code: "SUICIDE", reason: `Playing at (${point.row},${point.col}) would be suicide` };
  }

  let newKoPoint: Point | null = null;
  if (capturedOpponent === 1 && chain.liberties.size === 1) {
    const [koIdx] = chain.liberties;
    newKoPoint = {
      row: Math.floor(koIdx! / size),
      col: koIdx! % size,
    };
  }

  const capturedBlack = color === "white" ? capturedOpponent : 0;
  const capturedWhite = color === "black" ? capturedOpponent : 0;

  return { valid: true, board: next, capturedBlack, capturedWhite, newKoPoint };
}

export function applyPass(board: Board): { board: Board; newKoPoint: null } {
  return { board, newKoPoint: null };
}

export interface Score {
  readonly black: number;
  readonly white: number;
  readonly komi: number;
}

export function scoreBoard(
  board: Board,
  size: BoardSize,
  capturedBlack: number,
  capturedWhite: number,
  komi = 6.5,
): Score {
  const total = size * size;
  const visited = new Set<number>();
  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (let i = 0; i < total; i++) {
    if (visited.has(i) || board[i] !== "empty") continue;

    const region: number[] = [];
    const borderColors = new Set<string>();
    const stack = [i];

    while (stack.length > 0) {
      const idx = stack.pop()!;
      if (visited.has(idx)) continue;
      visited.add(idx);

      if (board[idx] !== "empty") {
        borderColors.add(board[idx] as string);
        continue;
      }

      region.push(idx);
      const row = Math.floor(idx / size);
      const col = idx % size;

      const nbIndices = [
        (row - 1) * size + col,
        (row + 1) * size + col,
        row * size + (col - 1),
        row * size + (col + 1),
      ].filter(
        (n) =>
          n >= 0 &&
          n < total &&
          Math.abs((n % size) - col) <= 1 &&
          !visited.has(n),
      );

      stack.push(...nbIndices);
    }

    if (borderColors.size === 1) {
      const [owner] = borderColors;
      if (owner === "black") blackTerritory += region.length;
      else if (owner === "white") whiteTerritory += region.length;
    }
  }

  const blackScore = blackTerritory + capturedWhite;
  const whiteScore = whiteTerritory + capturedBlack + komi;

  return { black: blackScore, white: whiteScore, komi };
}

export { emptyBoard };
