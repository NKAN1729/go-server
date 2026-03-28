const fs = require("fs");
const path = "services/ws-gateway/src/index.ts";
const content = fs.readFileSync(path, "utf8");
const fixed = content.replace(
  'import Redis from "ioredis";',
  'import { Redis } from "ioredis";'
);
fs.writeFileSync(path, fixed, "utf8");
console.log("Fixed. Line 3 is now:");
console.log(fixed.split("\n")[2]);
