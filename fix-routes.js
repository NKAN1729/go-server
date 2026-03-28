const fs = require("fs");
const path = "services/game-server/src/routes.ts";
const fixed = fs.readFileSync(path, "utf8").replace(
  'import { activateGame, applyMoveToGame, opponent } from "@go-server/go-game";',
  'import { activateGame, applyMoveToGame } from "@go-server/go-game";'
);
fs.writeFileSync(path, fixed, "utf8");
console.log("Fixed routes.ts — removed unused opponent import");
