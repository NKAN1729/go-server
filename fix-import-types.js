const fs = require("fs");

const fixes = [
  {
    path: "packages/go-game/src/__tests__/board.test.ts",
    from: "import { Board, BoardSize }",
    to:   "import type { Board, BoardSize }",
  },
  {
    path: "packages/go-game/src/__tests__/integration.test.ts",
    from: "import { Board }",
    to:   "import type { Board }",
  },
  {
    path: "packages/go-game/src/game.ts",
    from: "import { GameStatus }",
    to:   "import type { GameStatus }",
  },
  {
    path: "packages/go-game/src/game.ts",
    from: "import { Point }",
    to:   "import type { Point }",
  },
];

for (const { path, from, to } of fixes) {
  const content = fs.readFileSync(path, "utf8");
  if (!content.includes(from)) {
    console.log(`SKIP (not found): ${path} — "${from}"`);
    continue;
  }
  fs.writeFileSync(path, content.replace(from, to), "utf8");
  console.log(`Fixed: ${path}`);
}

console.log("\nDone. Run: pnpm lint");
