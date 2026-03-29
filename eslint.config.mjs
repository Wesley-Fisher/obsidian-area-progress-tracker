import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  {
    files: ["**/*.mjs", "**/*.cjs", "**/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly"
      }
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    // Allow 'any' for testing files very close to Obsidian
    files: [
      "src/tests/obsidianStub.ts",
      "src/tests/plugin/settings.test.ts",
      "src/tests/plugin/plugin.test.ts",
      "src/tests/plugin/main.test.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "**/.obsidian/**",
      "../test-vault-area-progress-tracker/**"
    ]
  }
];
