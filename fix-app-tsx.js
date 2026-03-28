const fs = require("fs");
const path = "client/src/App.tsx";
let content = fs.readFileSync(path, "utf8");

content = content.replace(
  "const [gameId, setGameId] = useState<string | null>(getGameIdFromHash);",
  "const [gameId, setGameId] = useState<string | null>(() => getGameIdFromHash() ?? null);"
);

fs.writeFileSync(path, content, "utf8");
console.log("Fixed App.tsx line 13.");
