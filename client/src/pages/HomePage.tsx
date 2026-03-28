import { useState }   from "react";
import { api }        from "../lib/api";

interface Props { onGameStart: (id: string) => void; }

type Difficulty = "beginner" | "easy" | "medium" | "hard" | "expert";

export function HomePage({ onGameStart }: Props) {
  const [name,       setName]       = useState("");
  const [joinId,     setJoinId]     = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function startVsBot() {
    setLoading(true); setError(null);
    try {
      const g = await api.createGame({
        vsBot: true, botDifficulty: difficulty,
        playerName: name || "Player",
      });
      onGameStart(g.id);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  async function startVsHuman() {
    setLoading(true); setError(null);
    try {
      const g = await api.createGame({ playerName: name || "Player" });
      onGameStart(g.id);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  async function joinGame() {
    if (!joinId.trim()) return;
    onGameStart(joinId.trim());
  }

  return (
    <div style={{ maxWidth: 440, margin: "80px auto", padding: "0 24px" }} className="fade-in">
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>碁 Go</h1>
      <p  style={{ color: "var(--ink-faint)", marginBottom: 36 }}>
        An ancient game, a modern board.
      </p>

      {/* Name */}
      <label style={labelStyle}>Your name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Anonymous"
        style={inputStyle}
      />

      {/* vs Bot */}
      <Section title="Play against the bot">
        <label style={labelStyle}>Difficulty</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          style={inputStyle}
        >
          {(["beginner","easy","medium","hard","expert"] as Difficulty[]).map(d => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>
        <PrimaryButton onClick={startVsBot} loading={loading}>
          Start vs Bot
        </PrimaryButton>
      </Section>

      {/* vs Human */}
      <Section title="Play against a friend">
        <PrimaryButton onClick={startVsHuman} loading={loading}>
          Create game & share link
        </PrimaryButton>
        <div style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 13, margin: "6px 0" }}>or</div>
        <input
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
          placeholder="Paste game ID…"
          style={inputStyle}
        />
        <PrimaryButton onClick={joinGame} loading={false} secondary>
          Join game
        </PrimaryButton>
      </Section>

      {error && <p style={{ color: "var(--red)", marginTop: 12, fontSize: 13 }}>{error}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom:  24,
      padding:       20,
      background:    "var(--paper-dark)",
      borderRadius:  "var(--radius)",
      border:        "1px solid rgba(0,0,0,0.07)",
      display:       "flex",
      flexDirection: "column",
      gap:           10,
    }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function PrimaryButton({
  onClick, loading, children, secondary,
}: {
  onClick: () => void; loading: boolean;
  children: React.ReactNode; secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding:      "10px 0",
        width:        "100%",
        borderRadius: "var(--radius)",
        fontWeight:   600,
        fontSize:     14,
        background:   secondary ? "transparent" : "var(--board-dark)",
        color:        secondary ? "var(--ink-light)" : "var(--paper)",
        border:       secondary ? "1px solid var(--board-line)" : "none",
        opacity:      loading ? 0.6 : 1,
      }}
    >
      {loading ? "…" : children}
    </button>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color:    "var(--ink-faint)",
  marginBottom: 4,
  display:  "block",
};

const inputStyle: React.CSSProperties = {
  width:        "100%",
  padding:      "8px 10px",
  borderRadius: "var(--radius)",
  border:       "1px solid var(--board-line)",
  background:   "var(--paper)",
  color:        "var(--ink)",
  fontSize:     14,
  boxSizing:    "border-box",
};
