interface Props {
  onPass:   () => void;
  onResign: () => void;
  disabled: boolean;
}

const btn: React.CSSProperties = {
  padding:      "8px 18px",
  borderRadius: "var(--radius)",
  fontSize:     14,
  fontWeight:   500,
  background:   "var(--paper-dark)",
  color:        "var(--ink)",
  border:       "1px solid var(--board-line)",
};

export function GameControls({ onPass, onResign, disabled }: Props) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button style={btn} onClick={onPass}   disabled={disabled}>Pass</button>
      <button
        style={{ ...btn, color: "var(--red)", borderColor: "var(--red)" }}
        onClick={onResign}
        disabled={disabled}
      >
        Resign
      </button>
    </div>
  );
}
