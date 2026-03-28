const fs = require("fs");
const path = "services/matchmaker/src/index.ts";
const content = fs.readFileSync(path, "utf8");
const fixed = content.replace(
  'import Redis from "ioredis";',
  'import { Redis } from "ioredis";'
);
fs.writeFileSync(path, fixed, "utf8");
console.log("Fixed. Line 11 area now:");
fixed.split("\n").slice(8, 14).forEach((l, i) => console.log(i + 9, l));
