import type { Color } from "../lib/api";

interface Props {
  color:  Color;
  cx:     number;
  cy:     number;
  r:      number;
  isLast?: boolean;
}

export function Stone({ color, cx, cy, r, isLast }: Props) {
  const isBlack = color === "black";
  return (
    <g style={{ animation: "stoneDrop 0.18s ease both" }}>
      {/* shadow */}
      <circle cx={cx + 1} cy={cy + 1.5} r={r} fill="rgba(0,0,0,0.25)" />
      {/* body */}
      <circle
        cx={cx} cy={cy} r={r}
        fill={isBlack ? "var(--stone-black)" : "var(--stone-white)"}
        stroke={isBlack ? "none" : "var(--stone-white-border)"}
        strokeWidth={isBlack ? 0 : 1}
      />
      {/* gloss */}
      <ellipse
        cx={cx - r * 0.25} cy={cy - r * 0.28}
        rx={r * 0.38}       ry={r * 0.22}
        fill="rgba(255,255,255,0.35)"
        transform={`rotate(-30,${cx},${cy})`}
      />
      {/* last-move dot */}
      {isLast && (
        <circle
          cx={cx} cy={cy} r={r * 0.28}
          fill={isBlack ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)"}
        />
      )}
    </g>
  );
}
