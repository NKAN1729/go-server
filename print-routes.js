const fs = require("fs");
const lines = fs.readFileSync("services/game-server/src/routes.ts", "utf8").split("\n");
lines.slice(0, 10).forEach((l, i) => console.log(i + 1, JSON.stringify(l)));
