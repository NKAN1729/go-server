/**
 * App.tsx
 * Minimal hash-based router. No react-router dependency.
 * Hash format:  #/game/<id>
 */

import { useState, useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { GamePage } from "./pages/GamePage";

function getGameIdFromHash(): string | null {
  const m = window.location.hash.match(/^#\/game\/(.+)$/);
  return m?.[1] ?? null;
}

export function App() {
  const [gameId, setGameId] = useState<string | null>(() => getGameIdFromHash() ?? null);

  useEffect(() => {
    const onHash = () => setGameId(getGameIdFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function handleGameStart(id: string) {
    window.location.hash = `#/game/${id}`;
  }

  function handleHome() {
    window.location.hash = "";
  }

  if (gameId) {
    return <GamePage gameId={gameId} onHome={handleHome} />;
  }
  return <HomePage onGameStart={handleGameStart} />;
}
