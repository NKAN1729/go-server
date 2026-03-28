import { createGameState, activateGame, applyMoveToGame, boardToString } from "./packages/go-game/dist/index.js";

let state = activateGame(createGameState("game-1", 9));

// Replay the 10 moves
for (const [color, row, col] of [
  ["black", 2, 2], ["white", 6, 6],
  ["black", 2, 6], ["white", 6, 2],
  ["black", 4, 4], ["white", 0, 0],
  ["black", 0, 1], ["white", 1, 0],
  ["black", 2, 0], ["white", 3, 0],
]) {
  const r = applyMoveToGame(state, { kind: "place", point: { row, col } }, "p", color);
  if (r.ok) state = r.state;
}

console.log("Starting position:");
console.log(boardToString(state.board, 9));

// Black tries to surround white's left column group
const attackMoves = [
  ["black", 4, 0],  // block below white chain
  ["white", 8, 8],  // white plays elsewhere
  ["black", 0, 2],  // tighten around (0,0)
  ["white", 8, 7],  // white plays elsewhere
  ["black", 1, 1],  // close the net
  ["white", 8, 6],  // white plays elsewhere
];

for (const [color, row, col] of attackMoves) {
  const r = applyMoveToGame(state, { kind: "place", point: { row, col } }, "p", color);
  if (r.ok) {
    state = r.state;
    console.log(`\n${color} plays (${row},${col}) — captured black: ${state.capturedBlack}, captured white: ${state.capturedWhite}`);
  } else {
    console.log(`${color} (${row},${col}) REJECTED: ${r.error.code}`);
  }
}

console.log("\nFinal board:");
console.log(boardToString(state.board, 9));
console.log("Captured white stones:", state.capturedWhite);
console.log("Captured black stones:", state.capturedBlack);
