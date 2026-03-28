const fs = require("fs");
const path = "services/game-server/src/redis.ts";
const fixed = fs.readFileSync(path, "utf8").replace(
  'import Redis from "ioredis";',
  'import { Redis } from "ioredis";'
);
fs.writeFileSync(path, fixed, "utf8");
console.log("Fixed. New line:");
console.log(fixed.split("\n").find(l => l.includes("ioredis")));
