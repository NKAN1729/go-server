// .eslintrc.cjs  â€” root config inherited by every workspace
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
