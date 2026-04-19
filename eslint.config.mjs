import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import noRawTailwindColors from "./eslint-rules/no-raw-tailwind-colors.js";
import techdebtAllowlist from "./eslint.config.techdebt.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["warn", { allow: ["warn", "error", "log"] }],
    },
  },
  // Tech-debt allowlist (SPEC-TECHDEBT-CI-001) — removed in Sprint 45.
  ...techdebtAllowlist,
  // Atlas Design System token enforcement (Sprint 38+)
  // Warns on raw Tailwind colors (bg-red-500), focus:ring-0, and raw fonts.
  // Applied only to src/ components and pages, not tests or config.
  {
    files: ["src/**/*.tsx", "src/**/*.ts"],
    ignores: ["src/**/*.test.*", "src/**/__tests__/**"],
    plugins: {
      "atlas-design": {
        rules: {
          "no-raw-tailwind-colors": noRawTailwindColors,
        },
      },
    },
    rules: {
      "atlas-design/no-raw-tailwind-colors": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".claude/**",
      "coverage/**",
      "playwright-report/**",
      "next-env.d.ts",
      "eslint-rules/**",
    ],
  },
];

export default eslintConfig;
