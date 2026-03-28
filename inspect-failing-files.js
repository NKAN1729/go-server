const fs = require("fs");

const files = [
  "packages/go-game/src/__tests__/board.test.ts",
  "packages/go-game/src/__tests__/integration.test.ts",
  "packages/go-game/src/game.ts",
];

for (const f of files) {
  console.log("\n" + "=".repeat(60));
  console.log(f);
  const lines = fs.readFileSync(f, "utf8").split("\n");
  // print first 10 lines with raw JSON so we see every character
  lines.slice(0, 10).forEach((l, i) => console.log(i + 1, JSON.stringify(l)));
}
