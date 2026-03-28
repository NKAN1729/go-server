# setup-phase5.ps1
# Run from the root of your go-server monorepo:
#   .\setup-phase5.ps1
#
# If you get a permissions error, run this once first:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Safety check: must be run from the monorepo root ────────────────────────
if (-not (Test-Path "pnpm-lock.yaml")) {
    Write-Error "ERROR: run this script from the root of your go-server monorepo. (pnpm-lock.yaml not found here)"
    exit 1
}

Write-Host "==> Phase 5 setup starting..." -ForegroundColor Cyan

# ────────────────────────────────────────────────────────────────────────────
# 1. pnpm-workspace.yaml
# ────────────────────────────────────────────────────────────────────────────
@'
packages:
  - "packages/*"
  - "services/*"
  - "client"
'@ | Set-Content -Path "pnpm-workspace.yaml" -Encoding UTF8
Write-Host "  [1/6] pnpm-workspace.yaml written" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# 2. Root package.json — patch scripts + devDependencies via Node.js
# ────────────────────────────────────────────────────────────────────────────
node -e @"
const fs  = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.engines = { node: '>=20', pnpm: '>=9' };
pkg.packageManager = pkg.packageManager ?? 'pnpm@9.0.0';

pkg.scripts = {
  ...(pkg.scripts ?? {}),
  test:      'pnpm -r run test',
  lint:      'pnpm -r run lint',
  typecheck: 'pnpm -r run typecheck',
  build:     'pnpm -r run build',
  dev:       'docker compose up -d && pnpm -r --parallel run dev',
};

pkg.devDependencies = {
  ...(pkg.devDependencies ?? {}),
  '@typescript-eslint/eslint-plugin': '^7.0.0',
  '@typescript-eslint/parser':        '^7.0.0',
  'eslint':                           '^8.57.0',
  'eslint-plugin-boundaries':         '^4.0.0',
  'prettier':                         '^3.2.5',
  'typescript':                       '^5.4.5',
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"@
Write-Host "  [2/6] root package.json updated" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# 3. .eslintrc.cjs
# ────────────────────────────────────────────────────────────────────────────
@'
// .eslintrc.cjs  — root config inherited by every workspace
"use strict";

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "boundaries"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:boundaries/recommended",
  ],

  settings: {
    "boundaries/elements": [
      { type: "go-game",      pattern: "packages/go-game/src/**" },
      { type: "shared-types", pattern: "packages/shared-types/src/**" },
      { type: "game-server",  pattern: "services/game-server/src/**" },
      { type: "ws-gateway",   pattern: "services/ws-gateway/src/**" },
      { type: "client",       pattern: "client/src/**" },
    ],
    "boundaries/ignore": ["**/*.test.ts", "**/*.spec.ts"],
  },

  rules: {
    "boundaries/element-types": [
      "error",
      {
        default: "disallow",
        rules: [
          { from: "go-game",      allow: ["shared-types"] },
          { from: "shared-types", allow: [] },
          { from: "game-server",  allow: ["go-game", "shared-types"] },
          { from: "ws-gateway",   allow: ["shared-types"] },
          { from: "client",       allow: ["go-game", "shared-types"] },
        ],
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },

  ignorePatterns: ["dist/", "node_modules/", "coverage/", "*.js", "*.cjs"],
};
'@ | Set-Content -Path ".eslintrc.cjs" -Encoding UTF8
Write-Host "  [3/6] .eslintrc.cjs written" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# 4. .github/workflows/ci.yml
# ────────────────────────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path ".github\workflows" | Out-Null

@'
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: Test · Lint · Typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck (all workspaces)
        run: pnpm typecheck

      - name: Lint (all workspaces)
        run: pnpm lint

      - name: Test (all workspaces)
        run: pnpm test
'@ | Set-Content -Path ".github\workflows\ci.yml" -Encoding UTF8
Write-Host "  [4/6] .github/workflows/ci.yml written" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# 5. .github/workflows/deploy.yml
# ────────────────────────────────────────────────────────────────────────────
@'
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: true

jobs:
  ci:
    name: CI gate
    uses: ./.github/workflows/ci.yml

  deploy-game-server:
    name: Deploy game-server
    needs: ci
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Trigger Render deploy — game-server
        run: |
          curl --silent --show-error --fail \
            "${{ secrets.RENDER_DEPLOY_HOOK_GAME_SERVER }}"
          echo "game-server deploy triggered"

  deploy-ws-gateway:
    name: Deploy ws-gateway
    needs: deploy-game-server
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Trigger Render deploy — ws-gateway
        run: |
          curl --silent --show-error --fail \
            "${{ secrets.RENDER_DEPLOY_HOOK_WS_GATEWAY }}"
          echo "ws-gateway deploy triggered"
'@ | Set-Content -Path ".github\workflows\deploy.yml" -Encoding UTF8
Write-Host "  [5/6] .github/workflows/deploy.yml written" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# 6. Install new devDependencies
# ────────────────────────────────────────────────────────────────────────────
pnpm install
Write-Host "  [6/6] dependencies installed" -ForegroundColor Green

# ────────────────────────────────────────────────────────────────────────────
# Done
# ────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "✅  Phase 5 files are in place." -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Make sure every workspace package.json has these three scripts:"
Write-Host "       ""test"":      ""vitest run"""
Write-Host "       ""lint"":      ""eslint src --max-warnings 0"""
Write-Host "       ""typecheck"": ""tsc --noEmit"""
Write-Host "     (shared-types can use: ""test"": ""echo 'no tests'"")"
Write-Host ""
Write-Host "  2. Verify everything passes locally:"
Write-Host "       pnpm typecheck"
Write-Host "       pnpm lint"
Write-Host "       pnpm test"
Write-Host ""
Write-Host "  3. Add two secrets in GitHub:"
Write-Host "       Settings -> Secrets -> Actions -> New repository secret"
Write-Host "       RENDER_DEPLOY_HOOK_GAME_SERVER"
Write-Host "       RENDER_DEPLOY_HOOK_WS_GATEWAY"
Write-Host ""
Write-Host "  4. Commit and push. CI runs automatically on every branch."
Write-Host "     deploy.yml only fires on pushes to main."
