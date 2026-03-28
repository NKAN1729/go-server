const fs = require("fs");

const workspaces = [
  { path: "packages/go-game/package.json",       noTests: false },
  { path: "packages/shared-types/package.json",  noTests: true  },
  { path: "services/game-server/package.json",   noTests: false },
  { path: "services/ws-gateway/package.json",    noTests: false },
  { path: "client/package.json",                 noTests: false },
];

for (const { path, noTests } of workspaces) {
  const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
  pkg.scripts = {
    ...(pkg.scripts ?? {}),
    test:      noTests ? "echo 'no tests'" : "vitest run",
    lint:      "eslint src --max-warnings 0",
    typecheck: "tsc --noEmit",
  };
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
  console.log("updated", path);
}
