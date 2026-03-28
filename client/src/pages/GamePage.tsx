import { useGame }        from "../hooks/useGame";
import { Board }          from "../components/Board";
import { PlayerCard }     from "../components/PlayerCard";
import { GameControls }   from "../components/GameControls";

interface Props { gameId: string; onHome: () => void; }

export function GamePage({ gameId, onHome }: Props) {
  const { game, loading, error, placeStone, pass, resign } = useGame(gameId);

  if (loading) return <Centered>Loading game…</Centered>;
  if (error)   return <Centered style={{ color: "var(--red)" }}>{error}</Centered>;
  if (!game)   return null;

  const myColor: "black" | "white" = "black"; // TODO: derive from session
  const isMyTurn  = game.status === "playing" && game.turn === myColor;
  const isFinished = game.status === "finished";

  return (
    <div style={{
      display:   "flex",
      gap:       24,
      padding:   24,
      maxWidth:  960,
      margin:    "0 auto",
      flexWrap:  "wrap",
    }}>
      {/* Board column */}
      <div style={{ flex: "1 1 400px", minWidth: 300 }}>
        <Board
          board={game.board}
          lastMove={game.lastMove}
          onIntersection={placeStone}
          disabled={!isMyTurn || isFinished}
        />
      </div>

      {/* Side panel */}
      <div style={{
        flex:           "0 0 220px",
        display:        "flex",
        flexDirection:  "column",
        gap:            16,
      }}>
        <PlayerCard
          name={game.players.black}
          color="black"
          captures={game.captures.black}
          isActive={game.turn === "black" && !isFinished}
        />
        <PlayerCard
          name={game.players.white}
          color="white"
          captures={game.captures.white}
          isActive={game.turn === "white" && !isFinished}
        />

        <hr style={{ border: "none", borderTop: "1px solid var(--paper-dark)" }} />

        {isFinished ? (
          <div style={{ fontWeight: 600, color: "var(--green)" }}>
            {game.winner
              ? `${game.winner.charAt(0).toUpperCase() + game.winner.slice(1)} wins!`
              : "Game over"}
          </div>
        ) : (
          <GameControls
            onPass={pass}
            onResign={resign}
            disabled={!isMyTurn}
          />
        )}

        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          Move {game.moveNumber} · Game {gameId.slice(0, 8)}
        </div>

        <button
          onClick={onHome}
          style={{ marginTop: "auto", fontSize: 13, color: "var(--ink-faint)",
                   background: "none", textDecoration: "underline" }}
        >
          ← Back to lobby
        </button>
      </div>
    </div>
  );
}

function Centered({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", justifyContent: "center",
                  alignItems: "center", height: "60vh", ...style }}>
      {children}
    </div>
  );
}
