/**
 * Board.tsx
 * Pure SVG renderer. Receives board state as props.
 * Knows NOTHING about WebSockets, hooks, or game rules.
 */

import { useMemo } from "react";
import { Stone }   from "./Stone";
import type { Cell, GameStateDTO } from "../lib/api";

interface Props {
  board:    Cell[][];
  lastMove: GameStateDTO["lastMove"];
  onIntersection: (row: number, col: number) => void;
  disabled?: boolean;
}

const MARGIN = 28;   // px from edge to first line
const SIZE   = 560;  // total SVG width/height
const STAR_POINTS_19: [number,number][] = [
  [3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15],
];

export function Board({ board, lastMove, onIntersection, disabled }: Props) {
  const n      = board.length || 19;
  const step   = (SIZE - MARGIN * 2) / (n - 1);
  const r      = step * 0.46;

  const lines = useMemo(() => {
    const acc: JSX.Element[] = [];
    for (let i = 0; i < n; i++) {
      const pos = MARGIN + i * step;
      acc.push(
        <line key={`h${i}`}
          x1={MARGIN}       y1={pos}
          x2={SIZE - MARGIN} y2={pos}
          stroke="var(--board-line)" strokeWidth={0.8} />,
        <line key={`v${i}`}
          x1={pos}           y1={MARGIN}
          x2={pos}           y2={SIZE - MARGIN}
          stroke="var(--board-line)" strokeWidth={0.8} />,
      );
    }
    return acc;
  }, [n, step]);

  const starPoints = n === 19 ? STAR_POINTS_19 : [];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      style={{ maxWidth: SIZE, display: "block", userSelect: "none" }}
      aria-label="Go board"
    >
      {/* Board background */}
      <rect width={SIZE} height={SIZE} fill="var(--board)" rx={4} />

      {/* Grid lines */}
      {lines}

      {/* Star points */}
      {starPoints.map(([row, col]) => (
        <circle
          key={`star-${row}-${col}`}
          cx={MARGIN + col * step}
          cy={MARGIN + row * step}
          r={3.5}
          fill="var(--star-point)"
        />
      ))}

      {/* Hit targets — invisible, full-cell clickable squares */}
      {!disabled && board.map((rowArr, row) =>
        rowArr.map((cell, col) => (
          cell === "empty" && (
            <rect
              key={`hit-${row}-${col}`}
              x={MARGIN + col * step - step / 2}
              y={MARGIN + row * step - step / 2}
              width={step} height={step}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={() => onIntersection(row, col)}
            />
          )
        ))
      )}

      {/* Stones */}
      {board.map((rowArr, row) =>
        rowArr.map((cell, col) => {
          if (cell === "empty") return null;
          const isLast =
            lastMove?.[0] === row && lastMove?.[1] === col;
          return (
            <Stone
              key={`stone-${row}-${col}`}
              color={cell}
              cx={MARGIN + col * step}
              cy={MARGIN + row * step}
              r={r}
              isLast={isLast}
            />
          );
        })
      )}
    </svg>
  );
}
