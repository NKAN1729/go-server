const fs = require("fs");

const workspaces = [
  "services/ws-gateway",
  "services/game-server",
  "services/matchmaker",
  "client",
];

for (const ws of workspaces) {
  const path = `${ws}/package.json`;
  const pkg = JSON.parse(fs.readFileSync(path, "utf8"));

  // Check if there are any actual test files before deciding
  const { execSync } = require("child_process");
  let hasTests = false;
  try {
    const result = execSync(`dir /s /b "${ws}\\src\\*.test.ts" "${ws}\\src\\*.spec.ts" 2>nul`, { shell: "cmd.exe" }).toString();
    hasTests = result.trim().length > 0;
  } catch {
    hasTests = false;
  }

  if (!hasTests) {
    pkg.scripts.test = "echo 'no tests'";
    fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`${ws}: no test files found — set to echo placeholder`);
  } else {
    console.log(`${ws}: has test files — keeping vitest run`);
  }
}
