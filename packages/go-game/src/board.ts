import type { Board, BoardSize, Cell, Color, Point } from "@go-server/shared-types";

export function emptyBoard(size: BoardSize): Board {
  return new Array<Cell>(size * size).fill("empty");
}

export function pointToIndex(point: Point, size: BoardSize): number {
  return point.row * size + point.col;
}

export function indexToPoint(index: number, size: BoardSize): Point {
  return { row: Math.floor(index / size), col: index % size };
}

export function isOnBoard(point: Point, size: BoardSize): boolean {
  return point.row >= 0 && point.row < size && point.col >= 0 && point.col < size;
}

export function pointsEqual(a: Point, b: Point): boolean {
  return a.row === b.row && a.col === b.col;
}

export function getCell(board: Board, point: Point, size: BoardSize): Cell {
  return board[pointToIndex(point, size)] as Cell;
}

export function setCell(board: Board, point: Point, size: BoardSize, cell: Cell): Board {
  const next = board.slice();
  next[pointToIndex(point, size)] = cell;
  return next;
}

export function neighbours(point: Point, size: BoardSize): Point[] {
  const { row, col } = point;
  return (
    [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ] as Point[]
  ).filter((p) => isOnBoard(p, size));
}

export interface Chain {
  readonly color: Color;
  readonly points: ReadonlySet<number>;
  readonly liberties: ReadonlySet<number>;
}

export function findChain(board: Board, start: Point, size: BoardSize): Chain | null {
  const startCell = getCell(board, start, size);
  if (startCell === "empty") return null;

  const color = startCell;
  const points = new Set<number>();
  const liberties = new Set<number>();
  const stack: Point[] = [start];
  const visited = new Set<number>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    const idx = pointToIndex(current, size);
    if (visited.has(idx)) continue;
    visited.add(idx);

    const cell = getCell(board, current, size);
    if (cell === "empty") { liberties.add(idx); continue; }
    if (cell !== color) continue;

    points.add(idx);
    for (const nb of neighbours(current, size)) stack.push(nb);
  }

  return { color, points, liberties };
}

export function libertyCount(board: Board, point: Point, size: BoardSize): number {
  return findChain(board, point, size)?.liberties.size ?? 0;
}

export function removeCaptured(board: Board, color: Color, size: BoardSize): [Board, number] {
  const visited = new Set<number>();
  let current = board;
  let captureCount = 0;

  for (let i = 0; i < size * size; i++) {
    if (visited.has(i)) continue;
    if (current[i] !== color) continue;

    const point = indexToPoint(i, size);
    const chain = findChain(current, point, size);
    if (!chain) continue;

    for (const idx of chain.points) visited.add(idx);

    if (chain.liberties.size === 0) {
      captureCount += chain.points.size;
      for (const idx of chain.points) {
        const newBoard = current.slice();
        newBoard[idx] = "empty";
        current = newBoard;
      }
    }
  }

  return [current, captureCount];
}

export function opponent(color: Color): Color {
  return color === "black" ? "white" : "black";
}

export function boardToString(board: Board, size: BoardSize): string {
  const rows: string[] = [];
  for (let row = 0; row < size; row++) {
    const cells = [];
    for (let col = 0; col < size; col++) {
      const cell = board[row * size + col];
      cells.push(cell === "black" ? "●" : cell === "white" ? "○" : "·");
    }
    rows.push(cells.join(" "));
  }
  return rows.join("\n");
}
