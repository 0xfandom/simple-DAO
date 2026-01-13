// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules",
      "dist",
      "artifacts",
      "cache",
      "typechain-types"
    ],
  },
];
