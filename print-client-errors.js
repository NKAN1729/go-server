const fs = require("fs");

const files = [
  "client/tsconfig.json",
  "client/src/App.tsx",
  "client/src/hooks/useGame.ts",
  "client/src/lib/api.ts",
];

for (const f of files) {
  console.log("\n" + "=".repeat(60));
  console.log(f);
  console.log("=".repeat(60));
  console.log(fs.readFileSync(f, "utf8"));
}
