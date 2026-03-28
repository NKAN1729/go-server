import type { Color } from "../lib/api";

interface Props {
  name:     string;
  color:    Color;
  captures: number;
  isActive: boolean;
}

export function PlayerCard({ name, color, captures, isActive }: Props) {
  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          12,
      padding:      "10px 14px",
      background:   isActive ? "var(--paper-dark)" : "transparent",
      borderRadius: "var(--radius)",
      border:       `1px solid ${isActive ? "var(--board-line)" : "transparent"}`,
      transition:   "background 0.2s, border-color 0.2s",
    }}>
      {/* Stone icon */}
      <svg width={22} height={22} viewBox="0 0 22 22">
        <circle cx={11} cy={11} r={9}
          fill={color === "black" ? "var(--stone-black)" : "var(--stone-white)"}
          stroke={color === "white" ? "var(--stone-white-border)" : "none"}
          strokeWidth={1.5}
        />
      </svg>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {captures} capture{captures !== 1 ? "s" : ""}
        </div>
      </div>

      {isActive && (
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--green)",
          animation: "pulse 1.5s infinite",
        }} />
      )}
    </div>
  );
}
