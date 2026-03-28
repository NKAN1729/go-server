const fs = require("fs");

const fixes = [
  {
    // Board and BoardSize imported but never referenced in the file body
    path: "packages/go-game/src/__tests__/board.test.ts",
    from: 'import type { Board, BoardSize } from "@go-server/shared-types";',
    to:   "",
  },
  {
    // Board imported but never referenced (BoardSize IS used on lines 7-8)
    path: "packages/go-game/src/__tests__/integration.test.ts",
    from: 'import type { Board, BoardSize } from "@go-server/shared-types";\r',
    to:   'import type { BoardSize } from "@go-server/shared-types";\r',
  },
  {
    // GameStatus and Point are in a multi-line import type block - remove just those names
    path: "packages/go-game/src/game.ts",
    from: '  GameStatus,\n',
    to:   "",
  },
  {
    path: "packages/go-game/src/game.ts",
    from: '  Point,\n',
    to:   "",
  },
];

for (const { path, from, to } of fixes) {
  const content = fs.readFileSync(path, "utf8");
  if (!content.includes(from)) {
    console.log(`SKIP (not found): ${path}\n  looking for: ${JSON.stringify(from)}`);
    continue;
  }
  fs.writeFileSync(path, content.replace(from, to), "utf8");
  console.log(`Fixed: ${path}`);
}

console.log("\nDone. Run: pnpm lint");
