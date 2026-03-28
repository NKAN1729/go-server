const fs = require("fs");
const lines = fs.readFileSync("client/src/App.tsx", "utf8").split("\n");
lines.forEach((l, i) => console.log(i + 1, JSON.stringify(l)));
