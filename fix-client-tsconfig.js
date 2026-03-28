const fs = require("fs");
const path = "client/tsconfig.json";
const tsconfig = JSON.parse(fs.readFileSync(path, "utf8"));

tsconfig.compilerOptions.types = ["vite/client"];

fs.writeFileSync(path, JSON.stringify(tsconfig, null, 2) + "\n");
console.log("Fixed client/tsconfig.json — added types: [\"vite/client\"]");
console.log(JSON.stringify(tsconfig, null, 2));
