const fs = require("fs");
const content = fs.readFileSync("services/ws-gateway/src/index.ts", "utf8");
console.log(content);
